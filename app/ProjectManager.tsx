"use client";
import { clamp, cloneWithProto, Coords } from "./common";
import { Device, makeDevice } from "./devices/Device";
import { DeviceType, deviceTypesDB } from "./devices/deviceTypesDB";
import {
  buildEmulatorContext,
  NetworkInterface,
} from "./emulators/DeviceEmulator";
import { Decal, emptyProject, Project } from "./Project";
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
  }
  deleteDevice(id: number) {
    const dev = this.project.devices.get(id)!;
    dev.internalState.netInterfaces.forEach((_, idx) =>
      this.disconnect(id, idx),
    );
    this.project.devices.delete(id);
    this.mutatedDecals ??= [];
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
    return;
  }
  disconnect(devId: number, ifId: number) {
    const intf = toInterfaceId(devId, ifId);
    if (!this.project.connections.has(intf)) return;
    this.project.connections.delete(this.project.connections.get(intf)!);
    this.project.connections.delete(intf);
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
        .toSorted()
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
  sendOn(intf: InterfaceId, toolCtx: ToolCtx, data: Buffer) {
    const target = this.getConnectedTo(intf);
    if (!target) return;
    const dev = this.project.devices.get(deviceOfIntf(target));
    if (!dev) return;
    const ifIdx = idxOfIntf(intf);
    console.assert(dev.internalState.netInterfaces.length > ifIdx);
    dev.emulator.packetHandler(buildEmulatorContext(dev, toolCtx), data, ifIdx);
  }
  addDecal(d: Omit<Decal, "id">): number {
    this.mutatedDecals ??= [];
    this.project.decals.push({ ...d, id: this.project.decals.length });
    return this.project.decals.length - 1;
  }
  removeDecal(id: number) {
    this.mutatedDecals ??= [];
    this.project.decals[id] = undefined;
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

  // Il costruttore serve a creare copie identiche del progetto
  // per scatenare un rerender
  constructor(old?: ProjectManager) {
    if (!old) {
      this.project = emptyProject();
      return;
    }

    if (!old.recyclable()) {
      old.applyMutations();
    } else {
      this.project = { ...old.project };
      this.viewBoxChange = false;
      // TODO: Copiare tutte le proprietà del manager
      return;
    }

    this.project = { ...old.project };

    // NOTE: dovrei probabilmente implementare una cosa simile: this.project.connections = new Map(old.project.connections);
    // FIXME: Non funziona nel momento in cui cambiano le connessioni
    // this.lastCables = old.project._temold.project.lastCables;
  }
}
