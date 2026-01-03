import { Coords } from "../common";
import { Tool, ToolCtx } from "./Tool";

export type RectTool = Tool<{
  startPos?: Coords;
  currPos?: Coords;
  fill: string;
  stroke: string;
}>;

function rectProps(
  mousedown: Coords,
  curr: Coords,
): Coords & { width: number; height: number } {
  return {
    x: Math.min(mousedown.x, curr.x),
    y: Math.min(mousedown.y, curr.y),
    width: Math.abs(mousedown.x - curr.x),
    height: Math.abs(mousedown.y - curr.y),
  };
}

export function makeRectTool(ctx: ToolCtx<RectTool>): RectTool {
  return {
    fill: "#000000",
    stroke: "none",
    ...ctx,
    toolname: "rect",
    panel: (ctx) => {
      if (ctx.tool.startPos === undefined || ctx.tool.currPos === undefined)
        return (
          <div>
            Trascina per disegnare un rettangolo <br />
            Riempimento:{" "}
            <input
              type="color"
              value={ctx.tool.fill}
              onChange={(ev) => {
                ctx.tool.fill = ev.target.value;
                ctx.updateTool();
              }}
            />
          </div>
        );
      return (
        <>
          Dimensioni: {ctx.tool.currPos.x - ctx.tool.startPos.x}x
          {ctx.tool.currPos.y - ctx.tool.startPos.y}
        </>
      );
    },
    onEvent: (ctx, ev) => {
      switch (ev.type) {
        case "mousedown":
          ctx.tool.startPos = ev.pos;
          ctx.tool.currPos = ev.pos;
          break;
        case "mousemove":
          if (!ctx.tool.startPos) return;
          ctx.tool.currPos = ev.pos;
          break;
        case "mouseup":
          if (!ctx.tool.startPos) return;
          const { x, y, width, height } = rectProps(ctx.tool.startPos, ev.pos);
          ctx.tool.startPos = undefined;
          ctx.updateTool();
          if (ev.pos.x || ev.pos.y) {
            ctx.project.addDecal({
              type: "rect",
              pos: { x, y },
              size: { width, height },
              fill: ctx.tool.fill,
              stroke: ctx.tool.stroke,
            });
            ctx.updateProject();
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
