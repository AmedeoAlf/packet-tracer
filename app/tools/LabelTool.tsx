import { Coords } from "../common";
import { Tool, ToolCtx } from "./Tool";

export type LabelTool = Tool & {
  currInput?: {
    text: string;
    pos: Coords;
  };
};

export function makeLabelTool(ctx: ToolCtx): LabelTool {
  return {
    ...ctx,
    toolname: "label",
    panel() {
      if (!this.currInput)
        return <p>Clicca sullo scenario per aggiungere testo</p>;
      return (
        <>
          Contenuto:
          <input
            type="text"
            value={this.currInput.text}
            onChange={(ev) => {
              this.currInput!.text = ev.target.value;
              this.update();
            }}
            autoFocus
          />
        </>
      );
    },
    onEvent(ev) {
      switch (ev.type) {
        case "click":
          if (this.currInput) {
            if (this.currInput.text.trim() != "") {
              this.project.addDecal({ type: "text", ...this.currInput });
              this.updateProject();
            }
            this.currInput = undefined;
          } else if (ev.decal) {
            this.currInput = { text: ev.decal.text, pos: ev.decal.pos };
            this.project.removeDecal(ev.decal.id);
            this.updateProject();
          } else {
            this.currInput = {
              text: "",
              pos: ev.pos,
            };
          }
          this.update();
          break;
      }
    },
    svgElements() {
      if (this.currInput) {
        return <text {...this.currInput.pos}>{this.currInput.text}</text>;
      }
    },
  };
}
