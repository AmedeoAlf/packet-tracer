"use client";
import { RefObject } from "react";
import { Coords } from "./common";
import { SelectTool } from "./tools/SelectTool";
import { Tool } from "./tools/Tool";
import { DeviceEmulator, routerEmulator } from "./DeviceEmulator";
import { ICONS } from "./Icons";

export type InternalState<Ext> = {
  netInterfaces: Array<string>;
} & Ext;

interface DeviceTypeData {
  iconId: keyof typeof ICONS;
  emulator: DeviceEmulator<any>;
}

export const deviceTypesDB: Record<string, DeviceTypeData> = {
  router: {
    iconId: "#router-icon",
    emulator: routerEmulator,
  },
};

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

export class Router extends Device {
  internalState: InternalState<{}> = {
    netInterfaces: ["interface_a", "interface_b"],
  };
  readonly deviceType = "router";
  constructor(id: number, pos: Coords, name: string) {
    super(id, pos, name);
  }
}

export function DeviceToSVG(
  device: Device,
  tool: RefObject<Tool>,
  props?: {},
) {
  const extra = { "data-id": device.id };
  const highlighted =
    (tool.current instanceof SelectTool) && tool.current.selected.has(device.id)
      ? " brightness-50"
      : "";
  return (
    <use
      href={deviceTypesDB[device.deviceType].iconId}
      key={device.id}
      className={"device" + highlighted}
      {...device.pos}
      {...extra}
      {...props}
    />
  );
}
