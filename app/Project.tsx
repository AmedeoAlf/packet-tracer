"use client";
import { Coords } from "./common";
import { Device } from "./devices/Device";
export { ProjectManager } from "./ProjectManager/ProjectManager";

export const jsonReplacer = (key: string, val: unknown): unknown => {
  if (key == "pos" && Array.isArray(val))
    val = val.map((it) => Number(it.toFixed(2)));
  return val;
};

export type InterfaceId = number;

export type DecalData = {
  pos: Coords;
} & (
  | {
      type: "text";
      text: string;
      fg: number;
    }
  | {
      type: "rect";
      size: Coords;
      fill?: number;
      stroke?: number;
    }
);

export type Decal = DecalData & {
  id: number;
};

/*
 * La classe che contiene tutti i dati del progetto attuale.
 * È l'unico oggetto da serializzare per salvare un progetto.
 */
export type Project = {
  // Tutti i dispositivi presenti
  devices: Map<number, Device>;
  // Tutti gli elementi decorativi sullo scenario
  decals: (Decal | null)[];
  // A cosa è connessa ogni interfaccia
  connections: Map<InterfaceId, InterfaceId>;

  // La posizione della telecamera
  viewBoxX: number;
  viewBoxY: number;

  // Lo zoom: 1 => 100%, 1.5 => 150%
  viewBoxZoom: number;

  // L'id dell'ultimo dispositivo creato
  lastId: number;
};

export type PacketLogEntry = {
  bytes: Buffer;
  tick: number;
  from: InterfaceId;
  to: InterfaceId;
};

// TODO: increase device bits, maybe reduce interface bits
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
