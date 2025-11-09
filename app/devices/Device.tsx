"use client";
import { Coords } from "../common";
import { DeviceEmulator, InternalState } from "../emulators/DeviceEmulator";
import { DeviceType } from "./deviceTypesDB";
import { ICONS } from "./ICONS";

export interface DeviceFactory {
  iconId: keyof typeof ICONS;
  emulator: DeviceEmulator<any>;
  deviceType: DeviceType;
  defaultState: () => InternalState<object>
}

export class Device {
  readonly id: number;
  readonly deviceType: DeviceType;
  name: string;
  pos: Coords;
  internalState: InternalState<object>;
  constructor(factory: DeviceFactory, id: number, pos: Coords, name: string) {
    this.id = id;
    this.pos = pos;
    this.name = name;
    this.deviceType = factory.deviceType;
    this.internalState = factory.defaultState();
  }
}
