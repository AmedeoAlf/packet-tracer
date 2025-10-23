"use client";
import { RefObject } from "react";
import { Coords } from "./common";
import { SelectTool, Tool } from "./Tool";

export type Icon = "#router-icon";

export class Device {
  id: number;
  pos: Coords;
  iconId: Icon;
  constructor(id: number, pos: Coords, icon: Icon) {
    this.id = id;
    this.pos = pos;
    this.iconId = icon;
  }
}

export class Router extends Device {
  constructor(id: number, pos: Coords) {
    super(id, pos, "#router-icon");
  }
}

export function DeviceComponent(
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
      href={device.iconId}
      key={device.id}
      className={"device" + highlighted}
      {...device.pos}
      {...extra}
      {...props}
    />
  );
}
