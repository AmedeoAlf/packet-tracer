"use client";
import { RefObject } from "react";
import {
  clamp,
  deepCopy,
  arraySwap,
  trustMeBroCast,
  filterObject,
  SimpleRecord,
  isRecord,
} from "../common";
import { Device } from "../devices/Device";
import { DeviceType, deviceTypesDB } from "../devices/deviceTypesDB";
import {
  AnyEmulatorContext,
  buildEmulatorContext,
  NetworkInterface,
  PhysicalInterfaceType,
} from "../emulators/DeviceEmulator";
import {
  Decal,
  DecalData,
  deviceOfIntf,
  idxOfIntf,
  InterfaceId,
  PacketLogEntry,
  Project,
  toInterfaceId,
} from "../Project";
import { ToolCtx } from "../tools/Tool";
import { createDevice, deleteDevice, duplicateDevice } from "./devices";
import {
  computeCables,
  connect,
  disconnect,
  getAllConnections,
  getCables,
  getConnectedTo,
  getInterface,
  getInterfaceFromId,
} from "./connections";

function emptyProject(): Project {
  return {
    devices: new Map(),
    decals: [],
    connections: new Map(),
    viewBoxX: 0,
    viewBoxY: 0,
    viewBoxZoom: 1,
    lastId: 0,
  };
}

export const MAX_ZOOM_FACTOR = 3;
export const MIN_ZOOM_FACTOR = 0.2;

type Callback = {
  onTick: number;
  fn: (t: ToolCtx) => void;
};
/*
 * La classe che contiene tutti i dati del progetto attuale.
 * È l'unico oggetto da serializzare per salvare un progetto.
 */
export class ProjectManager {
  _project: Project;

  // Flag che definisce se riciclare `devices` e `connections`
  viewBoxChange: boolean = false;
  cantRecycle: boolean = false;
  mutatedDevices?: number[];
  mutatedDecals?: number[];
  cableCache?: Map<
    number,
    (Pick<NetworkInterface, "maxMbps"> & {
      intf: [number, number];
      type: PhysicalInterfaceType;
    })[]
  >;

  private callbacks: Callback[] = [];

  packetLog: PacketLogEntry[] = [];

  // Il tick processato in questo momento
  private emulatorTick: number = -1;
  // Il tick mostrato sul cronometro (per programmarne di nuovi)
  private tickRef: RefObject<number>;

  deviceFromTag(tag: HTMLOrSVGElement): Device | undefined {
    if (tag.dataset.id) {
      return this._project.devices.get(+tag.dataset.id);
    }
  }
  mutDevice(id: number): Device | undefined {
    if (!this._project.devices.has(id)) return;

    this.mutatedDevices ??= [];

    if (!this.mutatedDevices.includes(id)) {
      this._project.devices.set(
        id,
        cloneDevice(this._project.devices.get(id)!),
      );
      this.mutatedDevices.push(id);
    }
    return this._project.devices.get(id);
  }
  get immutableDevices(): Project["devices"] {
    return this._project.devices;
  }
  get immutableDecals(): Project["decals"] {
    return this._project.decals;
  }
  mutDecal(id: number): Decal | undefined {
    const dec = this._project.decals.at(id);
    if (!dec) return;
    this.mutatedDecals ??= [];
    if (!this.mutatedDecals.includes(id)) {
      this._project.decals[id] = deepCopy(dec);
      this.mutatedDecals.push(id);
    }
    return this._project.decals.at(id) ?? undefined;
  }
  decalFromTag(tag: HTMLOrSVGElement): Decal | undefined {
    if (tag.dataset.decalid) {
      return this._project.decals[+tag.dataset.decalid] ?? undefined;
    }
  }

  // device related methods
  createDevice = createDevice.bind(this);
  duplicateDevice = duplicateDevice.bind(this);
  deleteDevice = deleteDevice.bind(this);

  // connection related methods
  getInterface = getInterface.bind(this);
  getInterfaceFromId = getInterfaceFromId.bind(this);
  connect = connect.bind(this);
  disconnect = disconnect.bind(this);
  getCables = getCables.bind(this);
  computeCables = computeCables.bind(this);
  getConnectedTo = getConnectedTo.bind(this);
  getAllConnections = getAllConnections.bind(this);

  setTimeout(
    fn: (t: AnyEmulatorContext) => void,
    device: number,
    delay: number,
  ): object {
    if (delay < 1) throw `setTimeout delay must be >0 (was ${delay})`;
    return this.delay((toolCtx) => {
      if (this.immutableDevices.has(device))
        fn(buildEmulatorContext(this.immutableDevices.get(device)!, toolCtx));
    }, delay);
  }
  removeTimeout(timeout: object) {
    const idx = this.callbacks.indexOf(timeout as Callback);
    if (idx == -1) return;
    this.callbacks.splice(idx, 1);
  }
  private delay(fn: (ctx: ToolCtx) => void, delay: number): object {
    this.callbacks.push({
      fn,
      onTick: this.currTick + delay,
    });
    return this.callbacks.at(-1)!;
  }
  sendOn(intf: InterfaceId, data: Buffer, toSelf = false) {
    const target = toSelf ? intf : this.getConnectedTo(intf);
    if (typeof target == "undefined") return;
    const dev = this._project.devices.get(deviceOfIntf(target));
    if (!dev) return;
    const ifIdx = idxOfIntf(target);
    console.assert(dev.internalState.netInterfaces.length > ifIdx);

    this.packetLog = [
      ...this.packetLog,
      {
        bytes: data,
        from: intf,
        to: target,
        tick: this.currTick,
      },
    ];

    this.delay(
      (toolCtx: ToolCtx) =>
        dev.emulator.packetHandler(
          buildEmulatorContext(dev, toolCtx),
          data,
          ifIdx,
        ),
      toSelf ? 0 : 1,
    );
  }
  areTicksPending() {
    return this.callbacks.length != 0;
  }
  runSimulation(toolCtx: ToolCtx) {
    const now = this.tickRef.current;
    while (true) {
      const newTick = this.nextCallback();
      if (typeof newTick == "undefined" || newTick > now) break;
      this.emulatorTick = newTick;
      this.processTick(toolCtx);
    }
    this.endSimulation();
  }
  // Can be called multiple times without problems
  beginSimulation() {
    this.emulatorTick = this.currTick;
  }
  // A bit more dangerous
  endSimulation() {
    this.emulatorTick = -1;
  }
  nextCallback() {
    if (this.callbacks.length == 0) return;

    const nextCallback = this.callbacks.reduce(
      (acc, val) => Math.min(acc, val.onTick),
      Infinity,
    );
    // // could implement checks to prevent ticks from the past...
    // if (nextCallback <= this.currTick)
    //   throw `There are callbacks in the past, currTick=${this.currTick}, callbacks=${this.callbacks.map((it) => it.onTick).join()}`;
    return nextCallback;
  }
  processTick(toolCtx: ToolCtx) {
    const toClear: Callback[] = [];
    for (const cb of this.callbacks.values()) {
      if (cb.onTick != this.currTick) continue;
      try {
        cb.fn(toolCtx);
      } catch (e) {
        console.log("A callback shouldn't throw errors, but it threw");
        console.log(e);
      }
      toClear.push(cb);
    }
    if (toClear.length == 0) return;
    this.callbacks = this.callbacks.filter((cb) => !toClear.includes(cb));
    // NOTE: 100% not sure this is safe to comment
    // likely have to rewrite all packetHandlers
    //
    // toolCtx.updateProject();
  }
  addDecal(d: DecalData): number {
    this.mutatedDecals ??= [];
    this._project.decals.push({ ...d, id: this._project.decals.length });
    return this._project.decals.length - 1;
  }
  duplicateDecal(id: number): number | undefined {
    const old = this._project.decals.at(id) ?? null;
    if (old === null) return;

    return this.addDecal(deepCopy(old));
  }
  removeDecal(id: number) {
    this.mutatedDecals ??= [];
    this._project.decals[id] = null;
  }
  moveDecalIdx(id: number, offset: number): number {
    const step = Math.sign(offset);
    let target = id;
    while (offset != 0) {
      target += step;
      if (target < 0) return -1;
      switch (this.immutableDecals.at(target)) {
        case undefined:
          return -1;
        default:
          offset -= step;
        case null:
          continue;
      }
    }
    if (!this.immutableDecals.at(target)) return -1;

    arraySwap(this._project.decals, id, target);
    if (this._project.decals[id]) this._project.decals[id].id = id;
    // IDK perché c'è bisogno del ! qui
    if (this._project.decals[target]) this._project.decals[target]!.id = target;
    this.mutatedDecals ??= [];
    this.mutatedDecals.push(id, target);
    return target;
  }
  exportProject(): SimpleRecord {
    return {
      ...this._project,
      devices: this._project.devices
        .values()
        .map((dev) => ({
          ...dev,
          type: dev.deviceType,
          internalState:
            dev.serializeState?.() ?? removeTempFields(dev.internalState),
        }))
        .toArray(),
      connections: Object.fromEntries(this._project.connections.entries()),
    };
  }
  static fromSerialized(
    serialized: Record<string, unknown>,
    tickRef: ProjectManager["tickRef"],
  ) {
    const pm = ProjectManager.make(tickRef);
    function setIfPresent<P extends keyof typeof pm._project>(
      prop: P,
      transform: (t: unknown) => (typeof pm._project)[P] | undefined,
    ) {
      if (prop in serialized)
        pm._project[prop] = transform(serialized[prop]) ?? pm._project[prop];
    }
    pm._project = {
      ...pm._project,
      ...serialized,
    };
    setIfPresent("devices", (d) => {
      if (!Array.isArray(d)) return;

      type Validated = {
        type: DeviceType;
        id: number;
        internalState: SimpleRecord;
      };
      const mustHaveProps = [
        ["type", "string"],
        ["id", "number"],
        ["internalState", "object"],
      ] as const satisfies [keyof Validated, string][];
      return new Map(
        d
          .filter(
            (dev) =>
              isRecord(dev) &&
              mustHaveProps.every(
                ([prop, type]) => prop in dev && typeof dev[prop] == type,
              ) &&
              (dev as Validated).type in deviceTypesDB,
          )
          .map((parsed) => {
            trustMeBroCast<Validated>(parsed);
            const { type, id, ...props } = parsed;
            const factory = deviceTypesDB[type];
            const dev: Device = Object.create(factory.proto, {
              id: { value: +id, enumerable: true, writable: false },
            });
            dev.name = "invalid name";
            dev.pos = [0, 0];
            Object.assign(dev, props);
            dev.internalState = factory.proto.deserializeState?.(
              props.internalState,
            ) ?? {
              ...factory.defaultState(),
              ...props.internalState,
            };

            return [dev.id, dev];
          }),
      );
    });
    setIfPresent("connections", (d) => {
      if (typeof d !== "object" || d == null) return;
      return new Map(
        Object.entries(d).map(([from, to]) => [+from, to as number]),
      );
    });
    pm.beginSimulation();
    for (const d of pm.immutableDevices.values()) {
      const initFn = d.emulator.init;
      if (initFn) {
        pm.setTimeout(initFn, d.id, 1);
      }
    }
    return pm;
  }
  recyclable(): boolean {
    return (
      !this.cantRecycle &&
      this.viewBoxChange &&
      !this.mutatedDevices &&
      !this.mutatedDecals
    );
  }
  applyMutations() {
    if (this.mutatedDevices) {
      // TODO: check if needed
      // for (const id of this.mutatedDevices) {
      //   this.project.devices.set(
      //     id,
      //     cloneWithProto(this.project.devices.get(id)!),
      //   );
      // }
      this._project.devices = new Map(this._project.devices);
      this.mutatedDevices = undefined;
    }
    if (this.mutatedDecals) {
      // for (const id of this.mutatedDecals) {
      //   this.project.decals[id] = { ...this.project.decals[id]! };
      // }
      this._project.decals = [...this._project.decals];
      this.mutatedDecals = undefined;
    }
  }

  get lastId() {
    return this._project.lastId;
  }

  get viewBoxX() {
    return this._project.viewBoxX;
  }
  set viewBoxX(val) {
    this._project.viewBoxX = val;
  }

  get viewBoxY() {
    return this._project.viewBoxY;
  }
  set viewBoxY(val) {
    this._project.viewBoxY = val;
  }

  get viewBoxZoom() {
    return this._project.viewBoxZoom;
  }
  set viewBoxZoom(val: number) {
    this._project.viewBoxZoom = clamp(val, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR);
  }

  get currTick() {
    return this.emulatorTick != -1 ? this.emulatorTick : this.tickRef.current;
  }

  private constructor(project: Project, tickRef: ProjectManager["tickRef"]) {
    this._project = project;
    this.tickRef = tickRef;
    return;
  }

  static make(tickRef: ProjectManager["tickRef"]) {
    return new ProjectManager(emptyProject(), tickRef);
  }

  // Costruttore che serve a creare copie identiche del progetto
  // per scatenare un rerender
  newInstance() {
    const newProj = { ...this._project };
    if (this.mutatedDevices) newProj.devices = new Map(this._project.devices);
    if (this.mutatedDecals) newProj.decals = [...this._project.decals];
    if (
      !this.cableCache ||
      (this.mutatedDevices &&
        this.mutatedDevices.length != 0 &&
        this.mutatedDevices.some((dev) =>
          this.immutableDevices
            .get(dev)!
            .internalState.netInterfaces.some((_, idx) =>
              this._project.connections.has(toInterfaceId(dev, idx)),
            ),
        ))
    ) {
      newProj.connections = new Map(this._project.connections);
      this.computeCables();
    }

    const next = new ProjectManager(newProj, this.tickRef);
    next.packetLog = this.packetLog;
    next.emulatorTick = this.emulatorTick;

    next.cableCache = this.cableCache;

    next.callbacks = [...this.callbacks];

    this.applyMutations();
    return next;
  }
}

export function removeTempFields<T extends object>(obj: T): T {
  return filterObject(obj, ([k]) => !k.endsWith("_t")) as T;
}

const cloneDevice = (d: Device): Device =>
  Object.setPrototypeOf({ ...d, pos: [...d.pos] }, Object.getPrototypeOf(d));
