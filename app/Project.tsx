"use client";
import { cloneWithProto, Coords } from "./common";
import { Device, makeDevice } from "./devices/Device";
import { DeviceType, deviceTypesDB } from "./devices/deviceTypesDB";
import {
  buildEmulatorContext,
  NetworkInterface,
} from "./emulators/DeviceEmulator";
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

export type Decal = {
  pos: Coords;
  id: number;
} & {
  type: "text";
  text: string;
};

/*
 * La classe che contiene tutti i dati del progetto attuale.
 * È l'unico oggetto da serializzare per salvare un progetto.
 */
export class Project {
  // Tutti i dispositivi presenti
  devices: Map<number, Device>;
  // Tutti gli elementi decorativi sullo scenario
  decals: (Decal | undefined)[];
  // A cosa è connessa ogni interfaccia
  private connections: Map<InterfaceId, InterfaceId>;

  // Proprietà non serializzate
  private _temp: {
    // Flag che definisce se riciclare `devices` e `connections`
    viewBoxChange: boolean;
    cantRecycle: boolean;
    mutatedDevices?: number[];
    mutatedDecals?: number[];
    lastCables?: ReturnType<Project["getCables"]>;
  } = {
      viewBoxChange: false,
      cantRecycle: false,
    };

  // La posizione della telecamera
  private _viewBoxX: number;
  private _viewBoxY: number;
  public get viewBoxX(): number {
    return this._viewBoxX;
  }
  public set viewBoxX(value: number) {
    this._viewBoxX = value;
    this._temp.viewBoxChange = true;
  }
  public get viewBoxY(): number {
    return this._viewBoxY;
  }
  public set viewBoxY(value: number) {
    this._viewBoxY = value;
    this._temp.viewBoxChange = true;
  }

  // Lo zoom: 1 => 100%, 1.5 => 150%
  private _viewBoxZoom: number;
  public get viewBoxZoom(): number {
    return this._viewBoxZoom;
  }
  public set viewBoxZoom(value: number) {
    this._viewBoxZoom = value;
    this._temp.viewBoxChange = true;
  }

  // L'id dell'ultimo dispositivo creato
  lastId: number;
  deviceFromTag(tag: HTMLOrSVGElement): Device | undefined {
    if (tag.dataset.id) {
      return this.devices.get(+tag.dataset.id);
    }
  }
  mutDevice(id: number): Device | undefined {
    if (!this.devices.has(id)) return;
    this._temp.mutatedDevices ??= [];
    if (!this._temp.mutatedDevices.includes(id))
      this._temp.mutatedDevices.push(id);
    return this.devices.get(id);
  }
  mutDecal(id: number): Decal | undefined {
    if (!this.decals.at(id)) return;
    this._temp.mutatedDecals ??= [];
    if (!this._temp.mutatedDecals.includes(id))
      this._temp.mutatedDecals.push(id);
    return this.decals.at(id);
  }
  decalFromTag(tag: HTMLOrSVGElement): Decal | undefined {
    if (tag.dataset.decalid) {
      return this.decals[+tag.dataset.decalid];
    }
  }
  createDevice(type: DeviceType, pos: Coords, name?: string) {
    function capitalize(s: string) {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    this._temp.mutatedDevices ??= [];

    ++this.lastId;
    this.devices.set(
      this.lastId,
      makeDevice(
        deviceTypesDB[type],
        this.lastId,
        pos,
        name ?? `${capitalize(type)} ${this.lastId}`,
      ),
    );
  }
  deleteDevice(id: number) {
    const dev = this.devices.get(id)!;
    dev.internalState.netInterfaces.forEach((_, idx) =>
      this.disconnect(id, idx),
    );
    this.devices.delete(id);
    this._temp.mutatedDecals ??= [];
  }
  getInterface(devId: number, ifId: number): NetworkInterface | undefined {
    return this.devices.get(devId)?.internalState.netInterfaces.at(ifId);
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
    this.connections.delete(this.connections.get(intfA) || -1);
    this.connections.delete(this.connections.get(intfB) || -1);
    this.connections.set(intfA, intfB);
    this.connections.set(intfB, intfA);
    return;
  }
  disconnect(devId: number, ifId: number) {
    const intf = toInterfaceId(devId, ifId);
    if (!this.connections.has(intf)) return;
    this.connections.delete(this.connections.get(intf)!);
    this.connections.delete(intf);
  }
  // Maps two deviceIds to the amount of connections between them
  getCables(): Map<number, Pick<NetworkInterface, "maxMbps" | "type">[]> {
    if (this._temp.lastCables) return this._temp.lastCables;
    const cabled = new Set<number>();
    const cableToOccurencies: ReturnType<Project["getCables"]> = new Map();
    for (const conn of this.connections) {
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
    this._temp.lastCables = cableToOccurencies;
    return cableToOccurencies;
  }
  getConnectedTo(intf: InterfaceId): InterfaceId | undefined {
    return this.connections.get(intf);
  }
  sendOn(intf: InterfaceId, toolCtx: ToolCtx, data: Buffer) {
    const target = this.getConnectedTo(intf);
    if (!target) return;
    const dev = this.devices.get(deviceOfIntf(target));
    if (!dev) return;
    const ifIdx = idxOfIntf(intf);
    console.assert(dev.internalState.netInterfaces.length > ifIdx);
    dev.emulator.packetHandler(buildEmulatorContext(dev, toolCtx), data, ifIdx);
  }
  addDecal(d: Omit<Decal, "id">): number {
    this._temp.mutatedDecals ??= [];
    this.decals.push({ ...d, id: this.decals.length });
    return this.decals.length - 1;
  }
  removeDecal(id: number) {
    this._temp.mutatedDecals ??= [];
    this.decals[id] = undefined;
  }
  recyclable(): boolean {
    return (
      !this._temp.cantRecycle &&
      this._temp.viewBoxChange &&
      !this._temp.mutatedDevices &&
      !this._temp.mutatedDecals
    );
  }
  applyMutations() {
    if (this._temp.mutatedDevices) {
      for (const id of this._temp.mutatedDevices) {
        this.devices.set(id, cloneWithProto(this.devices.get(id)!));
      }
      this.devices = new Map(this.devices);
    }
    if (this._temp.mutatedDecals) {
      for (const id of this._temp.mutatedDecals) {
        this.decals[id] = { ...this.decals[id]! };
      }
      this.decals = [...this.decals];
    }
  }
  // Il construttore serve a creare copie identiche del progetto
  // per scatenare un rerender
  constructor(p?: Project) {
    if (p) {
      if (!p.recyclable()) {
        p.applyMutations();
      } else {
        this.devices = p.devices;
        this.decals = p.decals;
        this.connections = p.connections;
        this.lastId = p.lastId;
        this._temp = {
          ...p._temp,
          viewBoxChange: false,
        };
        this._viewBoxX = p._viewBoxX;
        this._viewBoxY = p._viewBoxY;
        this._viewBoxZoom = p._viewBoxZoom;
        return;
      }
    }
    if (p) {
      this.devices = p.devices;
      this.decals = p.decals;
    } else {
      this.devices = new Map();
      this.decals = [];
    }
    this.connections = new Map(p?.connections);
    this.lastId = p?.lastId ?? 0;
    this._viewBoxX = p?._viewBoxX ?? 0;
    this._viewBoxY = p?._viewBoxY ?? 0;
    this._viewBoxZoom = p?._viewBoxZoom ?? 1;
  }
}
