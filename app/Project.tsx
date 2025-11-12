"use client";
import { Coords } from "./common";
import { Device } from "./devices/Device";
import { deviceTypesDB } from "./devices/deviceTypesDB";

/*
  * La classe che contiene tutti i dati del progetto attuale.
  * È l'unico oggetto da serializzare per salvare un progetto.
  */
export class Project {
  // Tutti i dispositivi presenti
  devices: Record<number, Device>;
  // La posizione della telecamera
  viewBoxPos: Coords;
  // Lo zoom: 1 => 100%, 1.5 => 150%
  viewBoxZoom: number;
  // L'id dell'ultimo dispositivo creato
  lastId: number;
  deviceFromTag(tag: HTMLOrSVGElement): Device | undefined {
    if (tag.dataset.id) {
      return this.devices[+tag.dataset.id];
    }
  }
  createDevice(type: keyof typeof deviceTypesDB, pos: Coords, name?: string) {
    function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); };

    ++this.lastId;
    this.devices[this.lastId] = new Device(
      deviceTypesDB[type],
      this.lastId,
      pos,
      name || `${capitalize(type)} ${this.lastId}`
    );
  }
  // Il construttore serve a creare copie identiche del progetto
  // per scatenare un rerender
  constructor(p?: Project) {
    this.devices = { ...p?.devices };
    this.lastId = p?.lastId || 0;
    this.viewBoxPos = p?.viewBoxPos || { x: 0, y: 0 };
    this.viewBoxZoom = p?.viewBoxZoom || 1;
  }
}

