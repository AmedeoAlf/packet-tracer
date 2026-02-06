import { Coords } from "../common";
import { Tool } from "./Tool";

export type LabelTool = Tool<{
  currInput?: {
    text: string;
    pos: Coords;
  };
}>;

export function makeLabelTool(prev: LabelTool | object = {}): LabelTool {
  return {
    ...prev,
    toolname: "label",
    panel: (ctx) => {
      if (!ctx.tool.currInput) return;
      return (
        <div className="w-full p-2">
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
                if (ev.key == "Enter") {
                  ctx.project.addDecal({
                    type: "text",
                    ...ctx.tool.currInput!,
                  });
                  ctx.updateProject();
                  ctx.tool.currInput = undefined;
                  ctx.updateTool();
                }
              }}
              autoFocus
            />
          </div>
        </div>
      );
    },
    onEvent: (ctx, ev) => {
      switch (ev.type) {
        case "click":
          if (ctx.tool.currInput) {
            if (ctx.tool.currInput.text.trim() != "") {
              ctx.project.addDecal({ type: "text", ...ctx.tool.currInput });
              ctx.updateProject();
            }
            ctx.tool.currInput = undefined;
          } else if (ev.decal && ev.decal.type == "text") {
            ctx.tool.currInput = { text: ev.decal.text, pos: ev.decal.pos };
            ctx.project.removeDecal(ev.decal.id);
            ctx.updateProject();
          } else {
            ctx.tool.currInput = {
              text: "",
              pos: ev.pos,
            };
          }
          ctx.updateTool();
          break;
      }
    },
    svgElements: ({ tool }) => {
      if (tool.currInput) {
        return (
          <text x={tool.currInput.pos[0]} y={tool.currInput.pos[1]}>
            {tool.currInput.text}
          </text>
        );
      }
    },
  };
}
