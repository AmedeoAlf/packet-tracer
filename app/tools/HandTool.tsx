"use client";
import { Project } from "../Project";
import { Tool, ToolCtx } from "./Tool";

type HandToolCtx = ToolCtx & {
  holding: boolean
}

export const HandTool: Tool = {
  toolname: "hand",
  panel: (context) => {
    return (
      <div>
        Zoom level:
        <input
          type="number"
          min={0}
          max={500}
          step={10}
          value={Math.round(context.project.viewBoxZoom * 100)}
          onChange={ev => { context.project.viewBoxZoom = +ev.target.value / 100; context.updateProject() }}
        />%
      </div>
    )
  },
  onEvent(context, ev): void {
    const ctx = context as HandToolCtx;
    switch (ev.type) {
      case "mousedown":
        ctx.holding = true;
        break;
      case "mouseup":
        ctx.holding = false;
        break;
      case "mousemove":
        if (ctx.holding) {
          ctx.project.viewBoxPos.x -= ev.movement.x;
          ctx.project.viewBoxPos.y -= ev.movement.y;
          ctx.updateProject();
        }
        break;
    }
  },
  make: (context) => {
    const ctx = context as HandToolCtx;
    HandTool.ctx = ctx;
    return HandTool;
  },
  svgElements(context) {
    const ctx = context as HandToolCtx;
    return (
      <></>
    )
  },
}
