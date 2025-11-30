"use client"
import { Coords } from "./common";
import { Device, makeDevice } from "./devices/Device";
import { DeviceType, deviceTypesDB } from "./devices/deviceTypesDB";
import { buildEmulatorContext, NetworkInterface } from "./emulators/DeviceEmulator";
import { ToolCtx } from "./tools/Tool";

export type InterfaceId = number;

export function toInterfaceId(device: number, intfIdx: number): InterfaceId {
  console.assert(intfIdx < (1 << 8));
  return (device << 8) | intfIdx;
}

export function deviceOfIntf(i: InterfaceId): number {
  return i >> 8;
}

export function idxOfIntf(i: InterfaceId): number {
  return i & 0xFF;
}

export const MAX_ZOOM_FACTOR = 3;
export const MIN_ZOOM_FACTOR = 0.2;

/*
 * La classe che contiene tutti i dati del progetto attuale.
 * È l'unico oggetto da serializzare per salvare un progetto.
 */
export class Project {
  // Tutti i dispositivi presenti
  devices: Map<number, Device>;
  // A cosa è connessa ogni interfaccia
  private connections: Map<InterfaceId, InterfaceId>;

  // Proprietà non serializzate
  private _temp: {
    // Flag che definisce se riciclare `devices` e `connections`
    viewBoxChange: boolean;
    lastCables?: ReturnType<Project['getCables']>;
  } = { viewBoxChange: false };

  // La posizione della telecamera
  private _viewBoxX: number;
  private _viewBoxY: number;
  public get viewBoxX(): number { return this._viewBoxX; };
  public set viewBoxX(value: number) { this._viewBoxX = value; this._temp.viewBoxChange = true; };
  public get viewBoxY(): number { return this._viewBoxY; };
  public set viewBoxY(value: number) { this._viewBoxY = value; this._temp.viewBoxChange = true; };

  // Lo zoom: 1 => 100%, 1.5 => 150%
  private _viewBoxZoom: number;
  public get viewBoxZoom(): number { return this._viewBoxZoom; }
  public set viewBoxZoom(value: number) { this._viewBoxZoom = value; this._temp.viewBoxChange = true; }

  // L'id dell'ultimo dispositivo creato
  lastId: number;
  deviceFromTag(tag: HTMLOrSVGElement): Device | undefined {
    if (tag.dataset.id) {
      return this.devices.get(+tag.dataset.id);
    }
  }
  createDevice(type: DeviceType, pos: Coords, name?: string) {
    function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); };

    ++this.lastId;
    this.devices.set(this.lastId, makeDevice(
      deviceTypesDB[type],
      this.lastId,
      pos,
      name || `${capitalize(type)} ${this.lastId}`
    ));
  }
  getInterface(devId: number, ifId: number): NetworkInterface | undefined {
    return this.devices.get(devId)?.internalState.netInterfaces.at(ifId)
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
  // Maps two deviceIds to the amount of connections between them
  getCables(): Map<number, Pick<NetworkInterface, "maxMbps" | "type">[]> {
    if (this._temp.lastCables) return this._temp.lastCables;
    const cabled = new Set<number>();
    const cableToOccurencies: ReturnType<Project['getCables']> = new Map();
    for (const conn of this.connections) {
      if (cabled.has(conn[0])) continue;
      cabled.add(conn[1]);

      const key = [deviceOfIntf(conn[0]), deviceOfIntf(conn[1])].toSorted().reduce((acc, val) => (acc << 16) | val);
      if (!cableToOccurencies.has(key)) cableToOccurencies.set(key, []);

      const ifA = this.getInterfaceFromId(conn[0])!;
      const ifB = this.getInterfaceFromId(conn[1])!;
      cableToOccurencies.get(key)!.push({
        type: ifA.type,
        maxMbps: Math.min(ifA.maxMbps, ifB.maxMbps) as NetworkInterface['maxMbps']
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
    const ifIdx = idxOfIntf(intf)
    console.assert(dev.internalState.netInterfaces.length > ifIdx);
    dev.emulator.packetHandler(buildEmulatorContext(dev, toolCtx), data, ifIdx);
  }
  // Il construttore serve a creare copie identiche del progetto
  // per scatenare un rerender
  constructor(p?: Project) {
    // Se `viewBoxChange` è `true` allora ricicla la lista di dispositivi e connessioni
    if (p && p._temp.viewBoxChange) {
      this.devices = p.devices;
      this.connections = p.connections;
      this.lastId = p.lastId;
      this._temp.lastCables = p._temp.lastCables;
      this._viewBoxX = p._viewBoxX;
      this._viewBoxY = p._viewBoxY;
      this._viewBoxZoom = p._viewBoxZoom;
    } else {
      this.devices = new Map(p?.devices);
      this.connections = new Map(p?.connections);
      this.lastId = p?.lastId || 0;
      this._viewBoxX = p?._viewBoxX || 0;
      this._viewBoxY = p?._viewBoxY || 0;
      this._viewBoxZoom = p?._viewBoxZoom || 1;
    }
  }
}
