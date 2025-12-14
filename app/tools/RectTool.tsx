import { Coords } from "../common";
import { Tool, ToolCtx } from "./Tool";

export type RectTool = Tool & {
  startPos?: Coords;
  currPos?: Coords;
  fill: string;
  stroke: string;
};

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

export function makeRectTool(ctx: ToolCtx): RectTool {
  return {
    fill: "#000000",
    stroke: "none",
    ...ctx,
    toolname: "rect",
    panel() {
      if (this.startPos === undefined || this.currPos === undefined)
        return (
          <div>
            Trascina per disegnare un rettangolo <br />
            Riempimento:{" "}
            <input
              type="color"
              value={this.fill}
              onChange={(ev) => {
                this.fill = ev.target.value;
                this.update();
              }}
            />
          </div>
        );
      return (
        <>
          Dimensioni: {this.currPos.x - this.startPos.x}x
          {this.currPos.y - this.startPos.y}
        </>
      );
    },
    onEvent(ev) {
      switch (ev.type) {
        case "mousedown":
          this.startPos = ev.pos;
          this.currPos = ev.pos;
          break;
        case "mousemove":
          if (!this.startPos) return;
          this.currPos = ev.pos;
          break;
        case "mouseup":
          if (!this.startPos) return;
          const { x, y, width, height } = rectProps(this.startPos, ev.pos);
          this.startPos = undefined;
          this.update();
          if (ev.pos.x || ev.pos.y) {
            this.project.addDecal({
              type: "rect",
              pos: { x, y },
              size: { width, height },
              fill: this.fill,
              stroke: this.stroke,
            });
            this.updateProject();
          }
          return;
        default:
          return;
      }
      this.update();
    },
    svgElements() {
      if (this.startPos && this.currPos) {
        return (
          <rect
            {...rectProps(this.startPos, this.currPos)}
            fill={this.fill}
            stroke={this.stroke}
          />
        );
      }
    },
  };
}
