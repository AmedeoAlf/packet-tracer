"use client";
import { RefObject } from "react";
import { Coords } from "../common";
import { SelectTool, SelectToolCtx } from "../tools/SelectTool";
import { Tool } from "../tools/Tool";
import { DeviceEmulator, InternalState } from "../emulators/DeviceEmulator";
import { ICONS } from "./Icons";
import { Router } from "./Router";
import { deviceTypesDB } from "./deviceTypesDB";

export interface DeviceTypeData {
  iconId: keyof typeof ICONS;
  emulator: DeviceEmulator<any>;
  constr: typeof Router;
}

export abstract class Device {
  readonly id: number;
  abstract readonly deviceType: string;
  name: string;
  pos: Coords;
  abstract internalState: InternalState<any>;
  constructor(id: number, pos: Coords, name: string) {
    this.id = id;
    this.pos = pos;
    this.name = name;
  }
}
