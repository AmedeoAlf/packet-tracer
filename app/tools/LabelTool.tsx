import { Coords } from "../common";
import { ProjectManager } from "../ProjectManager";
import { isSelectTool, SelectTool } from "./SelectTool";
import { Tool, ToolCtx } from "./Tool";

export type LabelTool = Tool<{
  currInput?: {
    text: string;
    fg: string;
    pos: Coords;
  };
}>;

function finalizeCurrinput(ctx: ToolCtx<LabelTool>) {
  ctx.projectRef.current.addDecal({
    type: "text",
    ...ctx.tool.currInput!,
  });
  ctx.updateProject();
  ctx.toolRef.current.currInput = undefined;
  ctx.updateTool();
  ctx.revertTool();
}

export function makeLabelTool(
  prev: SelectTool | LabelTool | object = {},
  project: ProjectManager,
): LabelTool {
  let currInput = (prev as LabelTool).currInput;
  if (isSelectTool(prev) && prev.selectedDecals.size == 1) {
    const selectedDecalIdx = prev.selectedDecals.values().next().value!;
    const selectedDecal = project.immutableDecals.at(selectedDecalIdx);
    if (selectedDecal?.type == "text") {
      currInput = { ...selectedDecal };
      project.removeDecal(selectedDecalIdx);
    }
  }

  return {
    ...prev,
    currInput,
    toolname: "label",
    panel: (ctx) => {
      if (!ctx.tool.currInput) return;
      return (
        <>
          <div className="rounded-md font-bold px-2 p-2 bg-gray-700 text-gray-400 text-center w-full">
            Contenuto: <br />
            <textarea
              className="w-full"
              value={ctx.tool.currInput.text}
              onChange={(ev) => {
                ctx.tool.currInput!.text = ev.target.value;
                ctx.updateTool();
              }}
              onKeyDown={(ev) => {
                if (ev.key == "Enter") finalizeCurrinput(ctx);
              }}
              autoFocus
            />
            <div className="flex items-center">
              <p>Colore:</p>
              <input
                type="color"
                value={ctx.tool.currInput.fg ?? "#000"}
                onChange={(ev) => {
                  ctx.toolRef.current.currInput!.fg = ev.target.value;
                  ctx.updateTool();
                }}
              />
            </div>
          </div>
        </>
      );
    },
    onEvent: (ctx, ev) => {
      switch (ev.type) {
        case "click":
          if (ctx.tool.currInput) {
            finalizeCurrinput(ctx);
          } else if (ev.decal && ev.decal.type == "text") {
            ctx.toolRef.current.currInput = {
              ...ev.decal,
            };
            ctx.projectRef.current.removeDecal(ev.decal.id);
            ctx.updateProject();
          } else {
            ctx.toolRef.current.currInput = {
              text: "",
              pos: ev.pos,
              fg: "#fff",
            };
          }
          ctx.updateTool();
          break;
      }
    },
    svgElements: ({ tool }) => {
      if (tool.currInput) {
        return (
          <text
            x={tool.currInput.pos[0]}
            y={tool.currInput.pos[1]}
            fill={tool.currInput.fg ?? "#fff"}
            textDecoration="underline"
          >
            {tool.currInput.text || "|"}
          </text>
        );
      }
    },
  };
}
