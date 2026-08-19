"use client";
import { clamp, filterObject, SimpleRecord } from "../common";
import { PacketLogEntry, Project } from "../Project";
import { ToolCtx } from "../tools/Tool";
import DeviceManager from "./DeviceManager";
import fromSerialized from "./fromSerialized";
import SimulationManager from "./SimulationManager";
import newInstance from "./newInstance";
import ConnectionManager from "./ConnectionManager";
import DecalManager from "./DecalManager";

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

  packetLog: PacketLogEntry[] = [];

  // device handler class
  devices = new DeviceManager(this);
  // decal handler class
  decal = new DecalManager(this);

  // connection handler class
  conn = new ConnectionManager(this);

  // simulation handler class
  sim: SimulationManager;

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
