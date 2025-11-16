import { ReactNode } from "react";
import { Coords } from "./common";
import { Device } from "./devices/Device";
import { deviceTypesDB } from "./devices/deviceTypesDB";
import { NetworkInterface } from "./emulators/DeviceEmulator";

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
  getCables(): Map<number, number> {
    const cabled = new Set<number>();
    const cableToOccurencies = new Map<number, number>();
    for (const conn of this.connections) {
      if (cabled.has(conn[0])) continue;
      cabled.add(conn[1]);

      const key = [deviceOfIntf(conn[0]), deviceOfIntf(conn[1])].toSorted().reduce((acc, val) => (acc << 16) | val);
      cableToOccurencies.set(key, (cableToOccurencies.get(key) || 0) + 1)
    }
    return cableToOccurencies;
  }
  getConnectedTo(intfA: InterfaceId): InterfaceId | undefined {
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


export function Cables({ project, cables }: { project: Project, cables: ReturnType<Project['getCables']> }): ReactNode {
  return (<> {
    cables.entries()
      .flatMap(
        ([cable, amount]) => {
          const aPos = project.devices.get(cable >> 16)!!.pos;
          const bPos = project.devices.get(cable & 0xFFFF)!!.pos;

          // C'è un solo cavo tra due dispositivi, caso facile
          if (amount == 1) {
            return [{
              x1: aPos.x,
              x2: bPos.x,
              y1: aPos.y,
              y2: bPos.y
            }]
          }

          // Altrimenti disegnali con offset corretti
          const dx = bPos.x - aPos.x;
          const dy = bPos.y - aPos.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const CABLE_DIAMETER = Math.min(amount * 3 + 5, 20);
          const height = dx / len * CABLE_DIAMETER;
          const width = dy / len * CABLE_DIAMETER;

          const lines = [];
          for (let t = -0.5; t <= 0.5; t += 1 / (amount - 1)) {
            lines.push({
              x1: aPos.x - width * t,
              x2: bPos.x - width * t,
              y1: aPos.y + height * t,
              y2: bPos.y + height * t,
            })
          }
          return lines;
        }
      ).map(
        (position, idx) => <line {...position} stroke="black" key={idx} />
      )
  } </>)
}
