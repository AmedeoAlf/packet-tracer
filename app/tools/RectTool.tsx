import { Coords } from "../common";
import { ProjectManager } from "../ProjectManager";
import { isSelectTool, SelectTool } from "./SelectTool";
import { Tool } from "./Tool";

export type RectTool = Tool<{
  startPos?: Coords;
  currPos?: Coords;
  fill?: string;
  stroke?: string;
  editing?: number;
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

export function makeRectTool(
  prev: RectTool | SelectTool | object = {},
  project: ProjectManager,
): RectTool {
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
    fill: "#39774b",
    stroke: "#ffffff",
    ...prev,
    editing,
    toolname: "rect",
    panel: (ctx) => {
      if (ctx.tool.startPos && ctx.tool.currPos) return;
      if (typeof ctx.tool.editing == "number") {
        const decal = ctx.project.immutableDecals[ctx.tool.editing]!;
        if (decal.type != "rect") throw "How did I select a non-rect decal???";
        return (
          <>
            Dimensioni: {decal.size.width}x{decal.size.width} <br />
            <table>
              <tbody>
                <ColorSelectorRow
                  name="Riempimento"
                  color={decal.fill}
                  setColor={(color) => {
                    const d = ctx.projectRef.current.mutDecal(decal.id)!;
                    if (d.type == "rect") d.fill = color;
                    ctx.updateProject();
                  }}
                />
                <ColorSelectorRow
                  name="Contorno"
                  color={ctx.tool.stroke}
                  setColor={(color) => {
                    const d = ctx.projectRef.current.mutDecal(decal.id)!;
                    if (d.type == "rect") d.stroke = color;
                    ctx.updateProject();
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
          <div className="rounded-md px-2 p-1 bg-gray-800 text-gray-500">
            <table className="border-spacing-10">
              <tbody>
                <ColorSelectorRow
                  name="Riempimento"
                  color={ctx.tool.fill}
                  setColor={(color) => {
                    if (!color && !ctx.tool.stroke)
                      ctx.toolRef.current.stroke = "#ffffff";
                    ctx.toolRef.current.fill = color;
                    ctx.updateTool();
                  }}
                />
                <ColorSelectorRow
                  name="Contorno"
                  color={ctx.tool.stroke}
                  setColor={(color) => {
                    if (!color && !ctx.tool.fill)
                      ctx.toolRef.current.fill = "#ffffff";
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
    svgElements: ({ tool, project }) => {
      if (typeof tool.editing == "number") {
        const decal = project.immutableDecals[tool.editing]!;
        if (decal.type != "rect") throw "How did I get a non-rect decal";
        return (
          <rect
            x={decal.pos[0] + decal.size.width - 5}
            y={decal.pos[1] + decal.size.height - 5}
            width={10}
            height={10}
            fill="red"
            stroke="black"
            onMouseMove={() => {
              throw "Not yet implemented";
            }}
          />
        );
      }
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

function ColorSelectorRow({
  name,
  color,
  setColor,
}: {
  name: string;
  color?: string;
  setColor: (col?: string) => void;
}) {
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={typeof color == "string"}
          onChange={(ev) => setColor(ev.target.checked ? "#ffffff" : undefined)}
        />
      </td>
      <td>{name}</td>
      <td>
        <input
          className="align-middle"
          type="color"
          value={color ?? "#999999"}
          onChange={(ev) => setColor(ev.target.value)}
        />
      </td>
    </tr>
  );
}
