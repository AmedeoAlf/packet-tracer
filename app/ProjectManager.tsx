"use client";
import { RefObject } from "react";
import {
  clamp,
  cloneWithProto,
  Coords,
  deepCopy,
  arraySwap,
  trustMeBroCast,
  filterObject,
  SimpleRecord,
  capitalize,
} from "./common";
import { Device, makeDevice } from "./devices/Device";
import { DeviceType, deviceTypesDB } from "./devices/deviceTypesDB";
import {
  AnyEmulatorContext,
  buildEmulatorContext,
  NetworkInterface,
} from "./emulators/DeviceEmulator";
import { Decal, DecalData, emptyProject, Project } from "./Project";
import { AnyTool, ToolCtx } from "./tools/Tool";

export type InterfaceId = number;

export function toInterfaceId(device: number, intfIdx: number): InterfaceId {
  console.assert(intfIdx < 1 << 8);
  return (device << 8) | intfIdx;
}

export function deviceOfIntf(i: InterfaceId): number {
  return i >> 8;
}

export function idxOfIntf(i: InterfaceId): number {
  return i & 0xff;
}

export const MAX_ZOOM_FACTOR = 3;
export const MIN_ZOOM_FACTOR = 0.2;

type Callback = {
  onTick: number;
  fn: (t: ToolCtx<AnyTool>) => void;
};

/*
 * La classe che contiene tutti i dati del progetto attuale.
 * È l'unico oggetto da serializzare per salvare un progetto.
 */
export class ProjectManager {
  private project: Project;

  // Flag che definisce se riciclare `devices` e `connections`
  viewBoxChange: boolean = false;
  cantRecycle: boolean = false;
  mutatedDevices?: number[];
  mutatedDecals?: number[];
  lastCables?: ReturnType<ProjectManager["getCables"]>;

  private callbacks: Callback[] = [];
  // FIXME: figure out what to do with currTick

  // Il tick processato in questo momento
  tick: number = -1;
  // Il tick corrente (per programmarne di nuovi)
  private tickRef: RefObject<number>;

  deviceFromTag(tag: HTMLOrSVGElement): Device | undefined {
    if (tag.dataset.id) {
      return this.project.devices.get(+tag.dataset.id);
    }
  }
  mutDevice(id: number): Device | undefined {
    if (!this.project.devices.has(id)) return;

    this.mutatedDevices ??= [];

    if (!this.mutatedDevices.includes(id)) this.mutatedDevices.push(id);
    return this.project.devices.get(id);
  }
  get immutableDevices(): Project["devices"] {
    return this.project.devices;
  }
  get immutableDecals(): Project["decals"] {
    return this.project.decals;
  }
  mutDecal(id: number): Decal | undefined {
    if (!this.project.decals.at(id)) return;
    this.mutatedDecals ??= [];
    if (!this.mutatedDecals.includes(id)) this.mutatedDecals.push(id);
    return this.project.decals.at(id) ?? undefined;
  }
  decalFromTag(tag: HTMLOrSVGElement): Decal | undefined {
    if (tag.dataset.decalid) {
      return this.project.decals[+tag.dataset.decalid] ?? undefined;
    }
  }
  createDevice(type: DeviceType, pos: Coords, name?: string) {
    this.mutatedDevices ??= [];

    ++this.project.lastId;
    this.project.devices.set(
      this.project.lastId,
      makeDevice(
        deviceTypesDB[type],
        this.project.lastId,
        pos,
        name ?? `${capitalize(type)} ${this.project.lastId}`,
      ),
    );
    return this.project.lastId;
  }
  duplicateDevice(id: number, newName?: string): number | undefined {
    const old = this.project.devices.get(id);
    if (old === undefined) return;

    const newId = this.createDevice(old.deviceType, { ...old.pos }, newName);
    if (newId === undefined) return;

    const dup = this.project.devices.get(newId)!;
    // FIXME: ho poca fiducia in una deep copy dell'internalState
    dup.internalState = deepCopy(old.internalState);
    return newId;
  }
  deleteDevice(id: number) {
    const dev = this.project.devices.get(id);
    if (dev === undefined) return;
    dev.internalState.netInterfaces.forEach((_, idx) =>
      this.disconnect(id, idx),
    );
    this.project.devices.delete(id);
    this.mutatedDevices ??= [];
  }
  getInterface(devId: number, ifId: number): NetworkInterface | undefined {
    return this.project.devices
      .get(devId)
      ?.internalState.netInterfaces.at(ifId);
  }
  getInterfaceFromId(intf: InterfaceId): NetworkInterface | undefined {
    return this.getInterface(deviceOfIntf(intf), idxOfIntf(intf));
  }
  connect(devIdA: number, ifIdA: number, devIdB: number, ifIdB: number) {
    {
      const a = this.getInterface(devIdA, ifIdA);
      const b = this.getInterface(devIdB, ifIdB);
      if (!a || !b) return "Interfacce non trovate";
      if (a.type != b.type) return "Interfacce non compatibili";
    }
    const intfA = toInterfaceId(devIdA, ifIdA);
    const intfB = toInterfaceId(devIdB, ifIdB);
    this.project.connections.delete(this.project.connections.get(intfA) || -1);
    this.project.connections.delete(this.project.connections.get(intfB) || -1);
    this.project.connections.set(intfA, intfB);
    this.project.connections.set(intfB, intfA);
    this.lastCables = undefined;
    return;
  }
  disconnect(devId: number, ifId: number) {
    const intf = toInterfaceId(devId, ifId);
    if (!this.project.connections.has(intf)) return;
    this.project.connections.delete(this.project.connections.get(intf)!);
    this.project.connections.delete(intf);
    this.lastCables = undefined;
  }
  // Maps two deviceIds to the amount of connections between them
  getCables(): Map<
    number,
    (Pick<NetworkInterface, "maxMbps" | "type"> & { intf: [number, number] })[]
  > {
    if (this.lastCables) return this.lastCables;
    const cabled = new Set<number>();
    const cableToOccurencies: ReturnType<ProjectManager["getCables"]> =
      new Map();
    for (const conn of this.project.connections) {
      if (cabled.has(conn[0])) continue;
      cabled.add(conn[1]);

      const reversed = deviceOfIntf(conn[0]) > deviceOfIntf(conn[1]);
      if (reversed) conn.reverse();
      const key = [deviceOfIntf(conn[0]), deviceOfIntf(conn[1])].reduce(
        (acc, val) => (acc << 16) | val,
      );
      if (!cableToOccurencies.has(key)) cableToOccurencies.set(key, []);

      const ifA = this.getInterfaceFromId(conn[0])!;
      const ifB = this.getInterfaceFromId(conn[1])!;
      cableToOccurencies.get(key)!.push({
        type: ifA.type,
        maxMbps: Math.min(
          ifA.maxMbps,
          ifB.maxMbps,
        ) as NetworkInterface["maxMbps"],
        intf: conn.map((it) => idxOfIntf(it)) as [number, number],
      });
    }
    this.lastCables = cableToOccurencies;
    return cableToOccurencies;
  }
  getConnectedTo(intf: InterfaceId): InterfaceId | undefined {
    return this.project.connections.get(intf);
  }
  getAllConnectedTo(device: number): [InterfaceId, InterfaceId][] {
    return this.project.connections
      .entries()
      .filter(
        ([a, b]) => deviceOfIntf(a) == device || deviceOfIntf(b) == device,
      )
      .toArray();
  }
  setTimeout(
    fn: (t: AnyEmulatorContext) => void,
    device: Device,
    delay: number,
  ): object {
    if (delay < 1) throw `setTimeout delay must be >0 (was ${delay})`;
    return this.delay(
      (toolCtx) => fn(buildEmulatorContext(device, toolCtx)),
      delay,
    );
  }
  removeTimeout(timeout: object) {
    const idx = this.callbacks.indexOf(timeout as Callback);
    if (idx == -1) return;
    this.callbacks.splice(idx, 1);
  }
  private delay(fn: (ctx: ToolCtx<AnyTool>) => void, delay: number): object {
    console.log(`Adding delay ${delay} from ${this.currTick}`);
    this.callbacks.push({
      fn,
      onTick: this.currTick + delay,
    });
    return this.callbacks.at(-1)!;
  }
  sendOn(intf: InterfaceId, data: Buffer) {
    const target = this.getConnectedTo(intf);
    if (typeof target == "undefined") return;
    const dev = this.project.devices.get(deviceOfIntf(target));
    if (!dev) return;
    const ifIdx = idxOfIntf(target);
    console.assert(dev.internalState.netInterfaces.length > ifIdx);
    this.delay(
      (toolCtx: ToolCtx<AnyTool>) =>
        dev.emulator.packetHandler(
          buildEmulatorContext(dev, toolCtx),
          data,
          ifIdx,
        ),
      1,
    );
  }
  areTicksPending() {
    return this.callbacks.length != 0;
  }
  nextCallback() {
    if (this.callbacks.length == 0) return;

    const nextCallback = this.callbacks.reduce(
      (acc, val) => Math.min(acc, val.onTick),
      Infinity,
    );
    // FIXME: decide what to do with this code
    if (false && nextCallback <= this.currTick)
      throw `There are callbacks in the past, currTick=${this.currTick}, callbacks=${this.callbacks.map((it) => it.onTick).join()}`;

    return nextCallback;
  }
  processTick(toolCtx: ToolCtx<AnyTool>) {
    const toClear: Callback[] = [];
    for (const cb of this.callbacks.values()) {
      if (cb.onTick != this.currTick) continue;
      try {
        cb.fn(toolCtx);
      } catch (e) {
        console.log("A callback shouldn't throw errors, but it threw", e);
      }
      toClear.push(cb);
    }
    if (toClear.length == 0) return;
    this.callbacks = this.callbacks.filter((cb) => !toClear.includes(cb));
    toolCtx.updateProject();
  }
  addDecal(d: DecalData): number {
    this.mutatedDecals ??= [];
    this.project.decals.push({ ...d, id: this.project.decals.length });
    return this.project.decals.length - 1;
  }
  duplicateDecal(id: number): number | undefined {
    const old = this.project.decals.at(id) ?? null;
    if (old === null) return;

    return this.addDecal(deepCopy(old));
  }
  removeDecal(id: number) {
    this.mutatedDecals ??= [];
    this.project.decals[id] = null;
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

    arraySwap(this.project.decals, id, target);
    if (this.project.decals[id]) this.project.decals[id].id = id;
    // IDK perché c'è bisogno del ! qui
    if (this.project.decals[target]) this.project.decals[target]!.id = target;
    this.mutatedDecals ??= [];
    this.mutatedDecals.push(id, target);
    return target;
  }
  exportProject(): object {
    return {
      ...this.project,
      devices: this.project.devices
        .values()
        .map((dev) => ({
          ...dev,
          type: dev.deviceType,
          internalState:
            dev.serializeState?.() ?? removeTempFields(dev.internalState),
        }))
        .toArray(),
      connections: Object.fromEntries(this.project.connections.entries()),
    };
  }
  static fromSerialized(
    serialized: Record<string, unknown>,
    tickRef: ProjectManager["tickRef"],
  ) {
    const pm = ProjectManager.make(tickRef);
    function setIfPresent<P extends keyof typeof pm.project>(
      prop: P,
      transform: (t: unknown) => (typeof pm.project)[P] | undefined,
    ) {
      if (prop in serialized)
        pm.project[prop] = transform(serialized[prop]) ?? pm.project[prop];
    }
    pm.project = {
      ...pm.project,
      ...serialized,
    };
    setIfPresent("devices", (d) => {
      if (typeof d != "object" || d == null) return;
      // Convert old objects
      if (!Array.isArray(d)) {
        d = Object.values(d) as unknown[];
        console.log("Loaded old savefile");
      }
      trustMeBroCast<unknown[]>(d);

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
              typeof dev == "object" &&
              dev !== null &&
              mustHaveProps.every(
                ([prop, type]) =>
                  prop in dev && typeof (dev as SimpleRecord)[prop] == type,
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
      for (const id of this.mutatedDevices) {
        this.project.devices.set(
          id,
          cloneWithProto(this.project.devices.get(id)!),
        );
      }
      this.project.devices = new Map(this.project.devices);
      this.mutatedDevices = undefined;
    }
    if (this.mutatedDecals) {
      for (const id of this.mutatedDecals) {
        this.project.decals[id] = { ...this.project.decals[id]! };
      }
      this.project.decals = [...this.project.decals];
      this.mutatedDecals = undefined;
    }
  }

  get lastId() {
    return this.project.lastId;
  }

  get viewBoxX() {
    return this.project.viewBoxX;
  }
  set viewBoxX(val) {
    this.project.viewBoxX = val;
  }

  get viewBoxY() {
    return this.project.viewBoxY;
  }
  set viewBoxY(val) {
    this.project.viewBoxY = val;
  }

  get viewBoxZoom() {
    return this.project.viewBoxZoom;
  }
  set viewBoxZoom(val: number) {
    this.project.viewBoxZoom = clamp(val, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR);
  }

  get currTick() {
    return this.tick != -1 ? this.tick : this.tickRef.current;
  }

  private constructor(project: Project, tickRef: ProjectManager["tickRef"]) {
    this.project = project;
    this.tickRef = tickRef;
    return;
  }

  static make(tickRef: ProjectManager["tickRef"]) {
    return new ProjectManager(emptyProject(), tickRef);
  }

  // Costruttore che serve a creare copie identiche del progetto
  // per scatenare un rerender
  newInstance() {
    this.applyMutations();
    const next = new ProjectManager({ ...this.project }, this.tickRef);
    next.tick = this.tick;
    if (typeof this.mutatedDevices == "undefined")
      next.lastCables = this.lastCables;
    next.callbacks = this.callbacks;
    return next;
  }
}

export function removeTempFields<T extends object>(obj: T): T {
  return filterObject(obj, ([k]) => !k.endsWith("_t")) as T;
}
