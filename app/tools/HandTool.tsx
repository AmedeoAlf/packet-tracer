import { Tool, ToolCtx } from "./Tool";

export type HandTool = Tool<{ holding: boolean }>;

export function makeHandTool(ctx: ToolCtx<HandTool>): HandTool {
  return {
    holding: false,
    ...ctx,
    toolname: "hand",
    panel: (ctx) => {
      return (
        <div>
          Zoom level:
          <input
            type="number"
            min={0}
            max={500}
            step={10}
            value={Math.round(ctx.project.viewBoxZoom * 100)}
            onChange={(ev) => {
              ctx.project.viewBoxZoom = +ev.target.value / 100;
              ctx.updateProject();
              ctx.updateTool();
            }}
          />
          %
        </div>
      );
    },
    onEvent: (ctx, ev) => {
      switch (ev.type) {
        case "mousedown":
          ctx.tool.holding = true;
          break;
        case "mouseup":
          ctx.tool.holding = false;
          break;
        case "mousemove":
          if (ctx.tool.holding) {
            ctx.project.viewBoxX -= ev.movement.x / ctx.project.viewBoxZoom;
            ctx.project.viewBoxY -= ev.movement.y / ctx.project.viewBoxZoom;
            ctx.updateProject();
          }
          break;
      }
    },
    svgElements() {
      return <></>;
    },
  };
}
