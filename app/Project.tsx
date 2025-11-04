"use client";
import { Coords } from "./common";
import { Device } from "./devices/Device";
import { deviceTypesDB } from "./devices/deviceTypesDB";


export class Project {
  devices: Record<number, Device> = {};
  lastId: number;
  deviceFromTag(tag: SVGUseElement) {
    if (tag.dataset.id) {
      return this.devices[+tag.dataset.id];
    }
  }
  createDevice(type: keyof typeof deviceTypesDB, pos: Coords, name?: string) {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    ++this.lastId;
    this.devices[this.lastId] = new Device(
      deviceTypesDB[type],
      this.lastId,
      pos,
      name || `${capitalize(type)} ${this.lastId}`
    );
  }
  constructor(p?: Project) {
    this.devices = { ...p?.devices };
    this.lastId = p?.lastId || 0;
  }
}

