"use client";
import { Device } from "./Device";


export class Project {
  devices = new Map<number, Device>();
  deviceFromTag(tag: SVGUseElement) {
    if (tag.dataset.id) {
      return this.devices.get(+tag.dataset.id);
    }
  }
  constructor(p?: Project) {
    this.devices = new Map(p?.devices);
  }
}

