"use client";
import { SelectToolCtx } from "../tools/SelectTool";
import { Tool } from "../tools/Tool";
import { Device } from "./Device";
import { Router } from "./Router";
import { Switch } from "./Switch";


export const deviceTypesDB = {
  router: Router,
  switch: Switch
};

export type DeviceType = keyof typeof deviceTypesDB

export function DeviceComponent(
  device: Device,
  tool: Tool,
  props?: {},
) {
  const extra = { "data-id": device.id };
  const highlighted =
    tool.toolname == "select"
      && tool.ctx
      && (tool.ctx as SelectToolCtx).selected.has(device.id)
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
