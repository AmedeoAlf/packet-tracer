"use client";
import { routerEmulator } from "../emulators/routerEmulator";
import { SelectToolCtx } from "../tools/SelectTool";
import { Tool } from "../tools/Tool";
import { Device, DeviceTypeData } from "./Device";
import { Router } from "./Router";


export const deviceTypesDB: Record<string, DeviceTypeData> = {
  router: {
    iconId: "#router-icon",
    emulator: routerEmulator,
    constr: Router
  },
};

export function DeviceToSVG(
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
