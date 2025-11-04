"use client";
import { Coords } from "../common";
import { DeviceEmulator, InternalState } from "../emulators/DeviceEmulator";
import { ICONS } from "./Icons";

export interface DeviceFactory {
  iconId: keyof typeof ICONS;
  emulator: DeviceEmulator<any>;
  deviceType: string
  defaultState: () => InternalState<object>
}

export class Device {
  id: number;
  readonly deviceType: string;
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
