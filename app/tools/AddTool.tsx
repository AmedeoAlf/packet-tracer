"use client";
import { Tool, ToolCtx } from "./Tool";
import { DeviceType, deviceTypesDB } from "../devices/deviceTypesDB";
import { Coords } from "../common";

type AddToolCtx = ToolCtx & {
  deviceType: keyof typeof deviceTypesDB;
  cursorPos: Coords;
}

export const AddTool: Tool = {
  toolname: "add",
  panel: (context) => {
    const ctx = context as AddToolCtx;
    return (
      <div>
        Device type:
        <select
          defaultValue={ctx.deviceType}
          onChange={ev => { ctx.deviceType = ev.target.value as DeviceType; ctx.update() }} >
          {Object.keys(deviceTypesDB).map(it => (<option key={it} value={it}>{it}</option>))}
        </select>
      </div>
    )
  },
  onEvent(context, ev): void {
    const ctx = context as AddToolCtx;
    switch (ev.type) {
      case "click":
        ctx.project.createDevice(ctx.deviceType, ev.pos);
        ctx.updateProject();
        break;
      case "mousemove":
        ctx.cursorPos = ev.pos;
        ctx.update();
        break;
    }
  },
  make: (context) => {
    const ctx = context as AddToolCtx;
    AddTool.ctx = context;
    ctx.deviceType ||= Object.keys(deviceTypesDB)[0] as DeviceType;
    ctx.cursorPos ||= { x: 0, y: 0 };
    // ctx.indicator ||= deviceTypesDB[ctx.deviceType].iconId
    return AddTool;
  },
  svgElements(context) {
    const ctx = context as AddToolCtx;
    return (
      <use
        href={deviceTypesDB[ctx.deviceType].iconId}
        className="opacity-50"
        {...ctx.cursorPos}
      />
    )
  },
}
