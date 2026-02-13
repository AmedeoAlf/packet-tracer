import { Coords } from "../common";
import { Tool } from "./Tool";

export type RectTool = Tool<{
  startPos?: Coords;
  currPos?: Coords;
  fill: string;
  stroke: string;
}>;

function rectProps(
  mousedown: Coords,
  curr: Coords,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(mousedown[0], curr[0]),
    y: Math.min(mousedown[1], curr[1]),
    width: Math.abs(mousedown[0] - curr[0]),
    height: Math.abs(mousedown[1] - curr[1]),
  };
}

export function makeRectTool(prev: RectTool | object = {}): RectTool {
  return {
    fill: "#39774b",
    stroke: "none",
    ...prev,
    toolname: "rect",
    panel: (ctx) => {
      if (ctx.tool.startPos && ctx.tool.currPos) return;
      return (
        <div className="w-full text-center font-bold flex gap-2 flex-col">
          Trascina per disegnare un rettangolo
          <div className="rounded-md px-2 p-1 bg-gray-800 text-gray-500">
            Riempimento:&nbsp;
            <input
              className="align-middle"
              type="color"
              value={ctx.tool.fill}
              onChange={(ev) => {
                ctx.toolRef.current.fill = ev.target.value;
                ctx.updateTool();
              }}
            />
          </div>
        </div>
      );
    },
    onEvent: (ctx, ev) => {
      switch (ev.type) {
        case "mousedown":
          ctx.toolRef.current.startPos = ev.pos;
          ctx.toolRef.current.currPos = ev.pos;
          break;
        case "mousemove":
          if (!ctx.toolRef.current.startPos) return;
          ctx.toolRef.current.currPos = ev.pos;
          break;
        case "mouseup":
          if (!ctx.toolRef.current.startPos) return;
          const { x, y, width, height } = rectProps(
            ctx.toolRef.current.startPos,
            ev.pos,
          );
          ctx.toolRef.current.startPos = undefined;
          ctx.updateTool();
          if (ev.pos[0] || ev.pos[1]) {
            ctx.projectRef.current.addDecal({
              type: "rect",
              pos: [x, y],
              size: { width, height },
              fill: ctx.toolRef.current.fill,
              stroke: ctx.toolRef.current.stroke,
            });
            ctx.updateProject();
            ctx.revertTool();
          }
          return;
        default:
          return;
      }
      ctx.updateTool();
    },
    svgElements: ({ tool }) => {
      if (tool.startPos && tool.currPos) {
        return (
          <rect
            {...rectProps(tool.startPos, tool.currPos)}
            fill={tool.fill}
            stroke={tool.stroke}
          />
        );
      }
    },
  };
}
