"use client"
import { Coords } from "./common";
import { Device } from "./devices/Device";
import { deviceTypesDB } from "./devices/deviceTypesDB";
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
  // La posizione della telecamera
  viewBoxPos: Coords;
  // Lo zoom: 1 => 100%, 1.5 => 150%
  viewBoxZoom: number;
  // L'id dell'ultimo dispositivo creato
  lastId: number;
  deviceFromTag(tag: HTMLOrSVGElement): Device | undefined {
    if (tag.dataset.id) {
      return this.devices.get(+tag.dataset.id);
    }
  }
  createDevice(type: keyof typeof deviceTypesDB, pos: Coords, name?: string) {
    function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); };

    ++this.lastId;
    this.devices.set(this.lastId, new Device(
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
    deviceTypesDB[dev.deviceType].emulator.packetHandler(buildEmulatorContext(dev, toolCtx), data, ifIdx);
  }
  // Il construttore serve a creare copie identiche del progetto
  // per scatenare un rerender
  constructor(p?: Project) {
    this.devices = new Map(p?.devices);
    this.connections = new Map(p?.connections);
    this.lastId = p?.lastId || 0;
    this.viewBoxPos = p?.viewBoxPos || { x: 0, y: 0 };
    this.viewBoxZoom = p?.viewBoxZoom || 1;
  }
}
