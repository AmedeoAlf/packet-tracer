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
      if (!ctx.tool.currInput)
        return (
          <p className="h-8 rounded-md font-bold m-2 px-2 p-1 bg-gray-800 text-gray-500 text-center">
            Clicca sullo scenario per aggiungere testo
          </p>
        );
      return (
        <>
          <p className="h-8 rounded-md font-bold m-2 px-2 p-1 bg-gray-800 text-gray-500 text-center">
            Clicca sullo scenario per aggiungere testo
          </p>
          <div className="h-10 rounded-md font-bold m-2 px-2 p-2 bg-gray-700 text-gray-400 text-center w-[60%]">
            Contenuto:
            <input
              type="text"
              value={ctx.tool.currInput.text}
              onChange={(ev) => {
                ctx.tool.currInput!.text = ev.target.value;
                ctx.updateTool();
              }}
              autoFocus
            />
          </div>
        </>
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
        return <text {...tool.currInput.pos}>{tool.currInput.text}</text>;
      }
    },
  };
}
