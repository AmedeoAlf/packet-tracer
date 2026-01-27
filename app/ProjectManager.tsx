"use client";
import {
  clamp,
  cloneWithProto,
  Coords,
  deepCopy,
  PrimitiveType,
  trustMeBroCast,
} from "./common";
import { Device, makeDevice } from "./devices/Device";
import { DeviceType, deviceTypesDB } from "./devices/deviceTypesDB";
import {
  buildEmulatorContext,
  EmulatorContext,
  NetworkInterface,
} from "./emulators/DeviceEmulator";
import { Decal, DecalData, emptyProject, Project } from "./Project";
import { ToolCtx } from "./tools/Tool";

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
  fn: (t: ToolCtx<any>) => void;
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

  callbacks: Callback[] = [];

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
    return this.project.decals.at(id);
  }
  decalFromTag(tag: HTMLOrSVGElement): Decal | undefined {
    if (tag.dataset.decalid) {
      return this.project.decals[+tag.dataset.decalid];
    }
  }
  createDevice(type: DeviceType, pos: Coords, name?: string) {
    function capitalize(s: string) {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

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
  getCables(): Map<number, Pick<NetworkInterface, "maxMbps" | "type">[]> {
    if (this.lastCables) return this.lastCables;
    const cabled = new Set<number>();
    const cableToOccurencies: ReturnType<ProjectManager["getCables"]> =
      new Map();
    for (const conn of this.project.connections) {
      if (cabled.has(conn[0])) continue;
      cabled.add(conn[1]);

      const key = [deviceOfIntf(conn[0]), deviceOfIntf(conn[1])]
        .toSorted((a, b) => a - b)
        .reduce((acc, val) => (acc << 16) | val);
      if (!cableToOccurencies.has(key)) cableToOccurencies.set(key, []);

      const ifA = this.getInterfaceFromId(conn[0])!;
      const ifB = this.getInterfaceFromId(conn[1])!;
      cableToOccurencies.get(key)!.push({
        type: ifA.type,
        maxMbps: Math.min(
          ifA.maxMbps,
          ifB.maxMbps,
        ) as NetworkInterface["maxMbps"],
      });
    }
    this.lastCables = cableToOccurencies;
    return cableToOccurencies;
  }
  getConnectedTo(intf: InterfaceId): InterfaceId | undefined {
    return this.project.connections.get(intf);
  }
  setTimeout(
    fn: (t: EmulatorContext<any>) => void,
    device: Device,
    delay: number,
  ) {
    if (delay < 1) throw `setTimeout delay must be >0 (was ${delay})`;
    this.callbacks.push({
      onTick: this.currTick + delay,
      fn: (toolCtx) => fn(buildEmulatorContext(device, toolCtx)),
    });
  }
  sendOn(intf: InterfaceId, data: Buffer) {
    const target = this.getConnectedTo(intf);
    if (!target) return;
    const dev = this.project.devices.get(deviceOfIntf(target));
    if (!dev) return;
    const ifIdx = idxOfIntf(target);
    console.assert(dev.internalState.netInterfaces.length > ifIdx);
    this.callbacks.push({
      fn: (toolCtx: ToolCtx<any>) =>
        dev.emulator.packetHandler(
          buildEmulatorContext(dev, toolCtx),
          data,
          ifIdx,
        ),
      onTick: this.project.currTick + 1,
    });
    // dev.emulator.packetHandler(buildEmulatorContext(dev, toolCtx), data, ifIdx);
  }
  areTicksPending() {
    return this.callbacks.length != 0;
  }
  advanceTick(toolCtx: ToolCtx<any>) {
    this.project.currTick++;
    this.processCurrTick(toolCtx);
  }
  advanceTickToCallback(toolCtx: ToolCtx<any>) {
    if (this.callbacks.length == 0) return;

    const newTick = this.callbacks.reduce(
      (acc, val) => Math.min(acc, val.onTick),
      Infinity,
    );
    if (newTick <= this.project.currTick)
      throw `There are callbacks in the past, currTick=${this.currTick}, callbacks=${this.callbacks.map((it) => it.onTick).join()}`;
    this.project.currTick = newTick;
    this.processCurrTick(toolCtx);
  }
  private processCurrTick(toolCtx: ToolCtx<any>) {
    const toClear: number[] = [];
    for (const [i, { onTick, fn }] of this.callbacks.entries()) {
      if (onTick != this.project.currTick) continue;
      try {
        fn(toolCtx);
      } catch (e) {
        console.log("A callback shouldn't throw errors, but it threw");
        console.log(e);
      }
      toClear.push(i);
    }
    if (toClear.length == 0) return;
    this.callbacks = this.callbacks.filter((_, i) => !toClear.includes(i));
    toolCtx.updateProject();
  }
  addDecal(d: DecalData): number {
    this.mutatedDecals ??= [];
    this.project.decals.push({ ...d, id: this.project.decals.length });
    return this.project.decals.length - 1;
  }
  duplicateDecal(id: number): number | undefined {
    const old = this.project.decals.at(id);
    if (old === undefined) return undefined;

    return this.addDecal(deepCopy(old));
  }
  removeDecal(id: number) {
    this.mutatedDecals ??= [];
    this.project.decals[id] = undefined;
  }
  moveDecalIdx(id: number, offset: number): number {
    id = Math.max(id, 0);
    const to = Math.max(
      0,
      Math.min(id + offset, this.project.decals.length - 1),
    );
    if (this.project.decals.at(id)) {
      const toMove = this.project.decals.splice(id, 1)[0];
      this.project.decals.splice(to, 0, toMove);
      for (let i = Math.min(id, to); i <= Math.max(id, to); i++) {
        if (this.project.decals[i] !== undefined)
          this.project.decals[i]!.id = i;
      }
      this.mutatedDecals ??= [];
      return to;
      // this.mutatedDecals.push(...intRange(id, id + offset))
    }
    return 0;
  }
  exportProject(): object {
    const proj = {
      ...this.project,
      devices: {} as Record<number, any>,
      connections: Object.fromEntries(this.project.connections.entries()),
    };
    this.project.devices.entries().forEach(([id, dev]) => {
      proj.devices[id] = {
        ...dev,
        type: dev.deviceType,
        internalState: dev.serializeState?.() ?? dev.internalState,
      };
    });
    return proj;
  }
  static fromSerialized(serialized: Record<string, any>) {
    const pm = new ProjectManager();
    function setIfPresent<P extends keyof typeof pm.project>(
      prop: P,
      transform: (t: Required<unknown>) => (typeof pm.project)[P] | undefined,
    ) {
      if (prop in serialized)
        pm.project[prop] = transform(serialized[prop]) ?? pm.project[prop];
    }
    pm.project = {
      ...pm.project,
      ...serialized,
    };
    setIfPresent("devices", (d) => {
      if (typeof d != "object") return;
      const mustHaveProps: [string, PrimitiveType][] = [
        ["type", "string"],
        ["internalState", "object"],
      ];
      return new Map(
        Object.entries(d)
          .filter(
            ([, dev]) =>
              typeof dev == "object" &&
              dev !== null &&
              mustHaveProps.every(
                ([prop, type]) =>
                  prop in dev && typeof (dev as any)[prop] == type,
              ) &&
              Object.keys(deviceTypesDB).includes((dev as any).type),
          )
          .map(([id, dev]) => {
            trustMeBroCast<{
              type: DeviceType;
              internalState: Record<string, any>;
            }>(dev);
            trustMeBroCast<string>(id);
            const { type, ...props } = dev;
            const factory = deviceTypesDB[type as DeviceType];

            return [
              +id,
              Object.setPrototypeOf(
                {
                  name: "invalid name",
                  pos: { x: 0, y: 0 },
                  ...props,
                  internalState: factory.proto.deserializeState?.(
                    props.internalState,
                  ) ?? {
                    ...factory.defaultState(),
                    ...("internalState" in props &&
                    typeof props.internalState == "object"
                      ? props.internalState
                      : {}),
                  },
                  id: +id,
                },
                factory.proto,
              ),
            ];
          }),
      );
    });
    setIfPresent("connections", (d) => {
      if (typeof d !== "object") return;
      return new Map(
        Object.entries(d).map(([from, to]) => [+from, +(to as string)]),
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
    }
    if (this.mutatedDecals) {
      for (const id of this.mutatedDecals) {
        this.project.decals[id] = { ...this.project.decals[id]! };
      }
      this.project.decals = [...this.project.decals];
    }
  }

  get lastId() {
    return this.project.lastId;
  }

  // TODO: logica per il riciclo decente
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
    return this.project.currTick;
  }

  // Il costruttore serve a creare copie identiche del progetto
  // per scatenare un rerender
  constructor(old?: ProjectManager) {
    if (!old) {
      this.project = emptyProject();
      return;
    }

    old.applyMutations();
    if (old.mutatedDevices === undefined) this.lastCables = old.lastCables;
    this.callbacks = old.callbacks;
    this.project = { ...old.project };
  }
}
