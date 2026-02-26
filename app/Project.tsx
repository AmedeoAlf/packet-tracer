"use client";
import { Coords } from "./common";
import { Device } from "./devices/Device";

export type InterfaceId = number;

export type DecalData = {
  pos: Coords;
} & (
  | {
      type: "text";
      text: string;
      fg: string;
    }
  | {
      type: "rect";
      size: { width: number; height: number };
      fill?: string;
      stroke?: string;
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

  // Il tick corrente
  currTick: number;
};

export function emptyProject(): Project {
  return {
    devices: new Map(),
    decals: [],
    currTick: 0,
    connections: new Map(),
    viewBoxX: 0,
    viewBoxY: 0,
    viewBoxZoom: 1,
    lastId: 0,
  };
}
