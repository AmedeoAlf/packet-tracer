import { Coords, cssColor } from "../common";
import { PalettePicker } from "../editorComponents/PalettePicker";
import { ProjectManager } from "../ProjectManager";
import { isSelectTool, SelectTool } from "./SelectTool";
import { Tool, ToolConstructor } from "./Tool";

export type RectTool = Tool<RectTool> & {
  startPos?: Coords;
  currPos?: Coords;
  fill?: number;
  stroke?: number;
  editing?: number;
};

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

export const makeRectTool: ToolConstructor<RectTool> = (
  prev: RectTool | SelectTool | object = {},
  project: ProjectManager,
): RectTool => {
  const selectedDecal =
    isSelectTool(prev) && prev.selectedDecals.size == 1
      ? prev.selectedDecals.values().next().value
      : undefined;
  const editing =
    typeof selectedDecal == "number" &&
    project.immutableDecals.at(selectedDecal)?.type == "rect"
      ? selectedDecal
      : undefined;
  return {
    fill: undefined,
    stroke: 0,
    ...prev,
    editing,
    toolname: "rect",
    panel: (ctx) => {
      if (ctx.tool.startPos && ctx.tool.currPos) return;
      if (ctx.tool.editing !== undefined && !ctx.tool.startPos) {
        const decal = ctx.project.immutableDecals[ctx.tool.editing]!;
        if (decal.type != "rect") throw "How did I select a non-rect decal???";
        return (
          <>
            Dimensioni: {decal.size.width.toFixed(1)}x
            {decal.size.height.toFixed(1)} <br />
            <table>
              <tbody>
                <ColorSelectorRow
                  name="Riempimento"
                  color={decal.fill}
                  setColor={(color) => {
                    const d = ctx.projectRef.current.mutDecal(decal.id)!;
                    if (d.type != "rect") return;
                    d.fill = color;
                    if (typeof color == "undefined") d.stroke ??= 0;
                    ctx.updateProject();
                    ctx.updateTool();
                  }}
                />
                <ColorSelectorRow
                  name="Contorno"
                  color={decal.stroke}
                  setColor={(color) => {
                    const d = ctx.projectRef.current.mutDecal(decal.id)!;
                    if (d.type != "rect") return;
                    d.stroke = color;
                    if (typeof color == "undefined") d.fill ??= 0;
                    ctx.updateProject();
                    ctx.updateTool();
                  }}
                />
              </tbody>
            </table>
          </>
        );
      }
      return (
        <div className="w-full text-center font-bold flex gap-2 flex-col">
          Trascina per disegnare un rettangolo
          <div className="rounded-md px-2 p-1">
            <table className="border-spacing-10">
              <tbody>
                <ColorSelectorRow
                  name="Riempimento"
                  color={ctx.tool.fill}
                  setColor={(color) => {
                    if (typeof color == "undefined")
                      ctx.toolRef.current.stroke ??= 0;
                    ctx.toolRef.current.fill = color;
                    ctx.updateTool();
                  }}
                />
                <ColorSelectorRow
                  name="Contorno"
                  color={ctx.tool.stroke}
                  setColor={(color) => {
                    if (typeof color == "undefined")
                      ctx.toolRef.current.fill ??= 0;
                    ctx.toolRef.current.stroke = color;
                    ctx.updateTool();
                  }}
                />
              </tbody>
            </table>
          </div>
        </div>
      );
    },
    onEvent: (ctx, ev) => {
      if (
        ctx.toolRef.current.editing !== undefined &&
        !ctx.toolRef.current.startPos
      ) {
        if (ev.type == "mouseup") ctx.revertTool();
        return;
      }

      switch (ev.type) {
        case "mousedown":
          // Handle editing a rectangle correctly
          if (!ctx.toolRef.current.startPos)
            ctx.toolRef.current.startPos = ev.pos;
          ctx.toolRef.current.currPos = ev.pos;
          break;
        case "mousemove":
          if (!ctx.toolRef.current.startPos) return;
          ctx.toolRef.current.currPos = ev.pos;
          if (ctx.toolRef.current.editing !== undefined) {
            const { x, y, width, height } = rectProps(
              ctx.toolRef.current.startPos,
              ev.pos,
            );
            const decal = ctx.projectRef.current.mutDecal(
              ctx.toolRef.current.editing,
            );
            if (decal?.type != "rect") throw "How did I get a non-rect decal";
            decal.pos = [x, y];
            decal.size = { width, height };
            ctx.updateProject();
          }
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
            if (ctx.toolRef.current.editing !== undefined) {
              const decal = ctx.projectRef.current.mutDecal(
                ctx.toolRef.current.editing,
              );
              if (decal?.type != "rect") throw "How did I get a non-rect decal";
              decal.pos = [x, y];
              decal.size = { width, height };
            } else {
              ctx.projectRef.current.addDecal({
                type: "rect",
                pos: [x, y],
                size: { width, height },
                fill: ctx.toolRef.current.fill,
                stroke: ctx.toolRef.current.stroke,
              });
            }
            ctx.updateProject();
            ctx.revertTool();
          }
          return;
        default:
          return;
      }
      ctx.updateTool();
    },
    svgElements: (ctx) => {
      if (typeof ctx.tool.editing == "number" && !ctx.tool.startPos) {
        const decal = project.immutableDecals[ctx.tool.editing]!;
        if (decal.type != "rect") throw "How did I get a non-rect decal";
        return (
          <rect
            x={decal.pos[0] + decal.size.width - 5}
            y={decal.pos[1] + decal.size.height - 5}
            width={10}
            height={10}
            fill="red"
            stroke="black"
            onMouseDown={() => {
              const rect =
                ctx.projectRef.current.immutableDecals[
                  ctx.toolRef.current.editing!
                ];
              if (rect?.type != "rect") throw "Why am i not a rect?????";
              ctx.toolRef.current.startPos = rect.pos;
              ctx.toolRef.current.currPos = [
                rect.pos[0] + rect.size.width,
                rect.pos[1] + rect.size.height,
              ];
              ctx.updateTool();
            }}
          />
        );
      } else if (
        ctx.tool.startPos &&
        ctx.tool.currPos &&
        ctx.tool.editing === undefined
      ) {
        return (
          <rect
            {...rectProps(ctx.tool.startPos, ctx.tool.currPos)}
            fill={cssColor(ctx.tool.fill) ?? "none"}
            stroke={cssColor(ctx.tool.stroke) ?? "none"}
          />
        );
      }
    },
  };
};

function ColorSelectorRow({
  name,
  color,
  setColor,
}: {
  name: string;
  color?: number;
  setColor: (col?: number) => void;
}) {
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={typeof color == "number"}
          onChange={(ev) => setColor(ev.target.checked ? 0 : undefined)}
        />
      </td>
      <td>{name}</td>
      <td>
        <PalettePicker value={color} setValue={setColor} />
      </td>
    </tr>
  );
}
