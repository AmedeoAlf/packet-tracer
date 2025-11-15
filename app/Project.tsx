"use client";
import { Coords } from "./common";
import { Device } from "./devices/Device";
import { deviceTypesDB } from "./devices/deviceTypesDB";
import { NetworkInterface } from "./emulators/DeviceEmulator";

export type InterfaceId = number;

export function toInterfaceId(device: number, intfIdx: number): InterfaceId {
  console.log(device)
  console.assert(intfIdx < (1 << 8));
  return device << 8 + intfIdx;
}

export function deviceOfIntf(i: InterfaceId): number {
  return i >> 8;
}

export function idxOfIntf(i: InterfaceId): number {
  return i & 0xFF;
}

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
  getInterface(intf: InterfaceId): NetworkInterface | undefined {
    console.log(deviceOfIntf(intf), idxOfIntf(intf))
    return this.devices.get(deviceOfIntf(intf))?.internalState.netInterfaces.at(idxOfIntf(intf))
  }
  connect(intfA: InterfaceId, intfB: InterfaceId): boolean {
    {
      const a = this.getInterface(intfA);
      const b = this.getInterface(intfB);
      if (!a || !b) return false;
      console.log("A e B validi")
      if (a.type != b.type) return false;
      console.log("Hanno lo stesso tipo")
    }
    this.connections.delete(this.connections.get(intfA) || -1);
    this.connections.delete(this.connections.get(intfB) || -1);
    this.connections.set(intfA, intfB);
    this.connections.set(intfB, intfA);
    return true;
  }
  getCables(): [Device, Device][] {
    const cabled = new Set<number>();
    const result: [Device, Device][] = [];
    for (const conn of this.connections) {
      if (cabled.has(conn[0])) continue;
      cabled.add(conn[1]);
      result.push(conn.map(it => this.devices.get(deviceOfIntf(it))!!) as [Device, Device]);
    }
    return result;
  }
  getConnectedTo(intfA: InterfaceId): number | undefined {
    return this.connections.get(intfA);
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

