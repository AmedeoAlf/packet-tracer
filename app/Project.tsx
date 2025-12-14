"use client";
import { Coords } from "./common";
import { Device } from "./devices/Device";

export type InterfaceId = number;

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
export type Project = {
  // Tutti i dispositivi presenti
  devices: Map<number, Device>;
  // Tutti gli elementi decorativi sullo scenario
  decals: (Decal | undefined)[];
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
