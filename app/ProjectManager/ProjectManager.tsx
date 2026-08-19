"use client";
import {
  clamp,
  deepCopy,
  arraySwap,
  filterObject,
  SimpleRecord,
} from "../common";
import { Decal, DecalData, PacketLogEntry, Project } from "../Project";
import { ToolCtx } from "../tools/Tool";
import DeviceManager from "./DeviceManager";
import fromSerialized from "./fromSerialized";
import SimulationManager from "./SimulationManager";
import newInstance from "./newInstance";
import ConnectionManager from "./ConnectionManager";

function emptyProject(): Project {
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

const MAX_ZOOM_FACTOR = 3;
const MIN_ZOOM_FACTOR = 0.2;

export type Callback = {
  onTick: number;
  fn: (t: ToolCtx) => void;
};
/*
 * La classe che contiene tutti i dati del progetto attuale.
 * È l'unico oggetto da serializzare per salvare un progetto.
 */
export class ProjectManager {
  _project: Project;

  mutatedDecals?: number[];

  packetLog: PacketLogEntry[] = [];

  get immutableDecals(): Project["decals"] {
    return this._project.decals;
  }
  mutDecal(id: number): Decal | undefined {
    const dec = this._project.decals.at(id);
    if (!dec) return;
    this.mutatedDecals ??= [];
    if (!this.mutatedDecals.includes(id)) {
      this._project.decals[id] = deepCopy(dec);
      this.mutatedDecals.push(id);
    }
    return this._project.decals.at(id) ?? undefined;
  }
  decalFromTag(tag: HTMLOrSVGElement): Decal | undefined {
    if (tag.dataset.decalid) {
      return this._project.decals[+tag.dataset.decalid] ?? undefined;
    }
  }

  // device handler class
  devices = new DeviceManager(this);

  // connection handler class
  conn = new ConnectionManager(this);

  // simulation handler class
  sim: SimulationManager;

  addDecal(d: DecalData): number {
    this.mutatedDecals ??= [];
    this._project.decals.push({ ...d, id: this._project.decals.length });
    return this._project.decals.length - 1;
  }
  duplicateDecal(id: number): number | undefined {
    const old = this._project.decals.at(id) ?? null;
    if (old === null) return;

    return this.addDecal(deepCopy(old));
  }
  removeDecal(id: number) {
    this.mutatedDecals ??= [];
    this._project.decals[id] = null;
  }
  moveDecalIdx(id: number, offset: number): number {
    const step = Math.sign(offset);
    let target = id;
    while (offset != 0) {
      target += step;
      if (target < 0) return -1;
      switch (this.immutableDecals.at(target)) {
        case undefined:
          return -1;
        default:
          offset -= step;
        case null:
          continue;
      }
    }
    if (!this.immutableDecals.at(target)) return -1;

    arraySwap(this._project.decals, id, target);
    if (this._project.decals[id]) this._project.decals[id].id = id;
    // IDK perché c'è bisogno del ! qui
    if (this._project.decals[target]) this._project.decals[target]!.id = target;
    this.mutatedDecals ??= [];
    this.mutatedDecals.push(id, target);
    return target;
  }
  exportProject(): SimpleRecord {
    return {
      ...this._project,
      devices: this._project.devices
        .values()
        .map((dev) => ({
          ...dev,
          type: dev.deviceType,
          internalState:
            dev.serializeState?.() ?? removeTempFields(dev.internalState),
        }))
        .toArray(),
      connections: Object.fromEntries(this._project.connections.entries()),
    };
  }
  static fromSerialized = fromSerialized;

  get lastId() {
    return this._project.lastId;
  }

  get viewBoxX() {
    return this._project.viewBoxX;
  }
  set viewBoxX(val) {
    this._project.viewBoxX = val;
  }

  get viewBoxY() {
    return this._project.viewBoxY;
  }
  set viewBoxY(val) {
    this._project.viewBoxY = val;
  }

  get viewBoxZoom() {
    return this._project.viewBoxZoom;
  }
  set viewBoxZoom(val: number) {
    this._project.viewBoxZoom = clamp(val, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR);
  }

  constructor(project: Project, tickRef: SimulationManager["_tickRef"]) {
    this._project = project;
    this.sim = new SimulationManager(this, tickRef);
    return;
  }

  static make(tickRef: SimulationManager["_tickRef"]) {
    return new ProjectManager(emptyProject(), tickRef);
  }

  // Costruttore che serve a creare copie identiche del progetto
  // per scatenare un rerender
  newInstance = newInstance.bind(this);
}

export function removeTempFields<T extends object>(obj: T): T {
  return filterObject(obj, ([k]) => !k.endsWith("_t")) as T;
}
