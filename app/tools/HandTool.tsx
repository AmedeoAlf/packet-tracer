import { Tool } from "./Tool";

export type HandTool = Tool<{ holding: boolean }>;

export function makeHandTool(prev: HandTool | object = {}): HandTool {
  return {
    holding: false,
    ...prev,
    toolname: "hand",
    panel: (ctx) => {
      return (
        <div className="h-8 rounded-md font-bold m-2 px-2 p-1 bg-gray-700 text-gray-400">
          Zoom level:&nbsp;
          <input
            className="text-center w-15 rounded-md bg-gray-800"
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
          ctx.toolRef.current.holding = true;
          break;
        case "mouseup":
          ctx.toolRef.current.holding = false;
          ctx.revertTool();
          break;
        case "mousemove":
          if (ctx.tool.holding) {
            ctx.project.viewBoxX -= ev.movement[0] / ctx.project.viewBoxZoom;
            ctx.project.viewBoxY -= ev.movement[1] / ctx.project.viewBoxZoom;
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
