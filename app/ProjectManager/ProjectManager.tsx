"use client";
import { RefObject } from "react";
import {
  clamp,
  deepCopy,
  arraySwap,
  filterObject,
  SimpleRecord,
} from "../common";
import { Device } from "../devices/Device";
import {
  NetworkInterface,
  PhysicalInterfaceType,
} from "../emulators/DeviceEmulator";
import { Decal, DecalData, PacketLogEntry, Project } from "../Project";
import { ToolCtx } from "../tools/Tool";
import DeviceManager from "./DeviceManager";
import * as conn from "./connections";
import fromSerialized from "./fromSerialized";
import * as sim from "./simulation";
import newInstance from "./newInstance";

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

  mutatedDevices?: number[];
  mutatedDecals?: number[];
  cableCache?: Map<
    number,
    (Pick<NetworkInterface, "maxMbps"> & {
      intf: [number, number];
      type: PhysicalInterfaceType;
    })[]
  >;

  _callbacks: Callback[] = [];

  packetLog: PacketLogEntry[] = [];

  // Il tick processato in questo momento
  _emulatorTick: number = -1;
  // Il tick mostrato sul cronometro (per programmarne di nuovi)
  _tickRef: RefObject<number>;

  deviceFromTag(tag: HTMLOrSVGElement): Device | undefined {
    if (tag.dataset.id) {
      return this._project.devices.get(+tag.dataset.id);
    }
  }
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

  // device related methods
  devices = new DeviceManager(this);

  // connection related methods
  getInterface = conn.getInterface.bind(this);
  getInterfaceFromId = conn.getInterfaceFromId.bind(this);
  connect = conn.connect.bind(this);
  disconnect = conn.disconnect.bind(this);
  getCables = conn.getCables.bind(this);
  computeCables = conn.computeCables.bind(this);
  getConnectedTo = conn.getConnectedTo.bind(this);
  getAllConnections = conn.getAllConnections.bind(this);

  // simulation methods
  setTimeout = sim.setEmulatorTimeout.bind(this);
  removeTimeout = sim.removeTimeout.bind(this);
  sendOn = sim.sendOn.bind(this);
  areTicksPending() {
    return this._callbacks.length != 0;
  }
  runSimulation = sim.runSimulation.bind(this);
  // Can be called multiple times without problems
  beginSimulation() {
    this._emulatorTick = this.currTick;
  }
  // A bit more dangerous
  endSimulation() {
    this._emulatorTick = -1;
  }

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
  applyMutations() {
    if (this.mutatedDevices) {
      // TODO: check if needed
      // for (const id of this.mutatedDevices) {
      //   this.project.devices.set(
      //     id,
      //     cloneWithProto(this.project.devices.get(id)!),
      //   );
      // }
      this._project.devices = new Map(this._project.devices);
      this.mutatedDevices = undefined;
    }
    if (this.mutatedDecals) {
      // for (const id of this.mutatedDecals) {
      //   this.project.decals[id] = { ...this.project.decals[id]! };
      // }
      this._project.decals = [...this._project.decals];
      this.mutatedDecals = undefined;
    }
  }

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

  get currTick() {
    return this._emulatorTick != -1
      ? this._emulatorTick
      : this._tickRef.current;
  }

  constructor(project: Project, tickRef: ProjectManager["_tickRef"]) {
    this._project = project;
    this._tickRef = tickRef;
    return;
  }

  static make(tickRef: ProjectManager["_tickRef"]) {
    return new ProjectManager(emptyProject(), tickRef);
  }

  // Costruttore che serve a creare copie identiche del progetto
  // per scatenare un rerender
  newInstance = newInstance.bind(this);
}

export function removeTempFields<T extends object>(obj: T): T {
  return filterObject(obj, ([k]) => !k.endsWith("_t")) as T;
}
