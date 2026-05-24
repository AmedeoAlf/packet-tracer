"use client";
import { Coords } from "./common";
import { Device } from "./devices/Device";

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

export function emptyProject(): Project {
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
