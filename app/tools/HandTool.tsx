import { Tool, ToolCtx } from "./Tool";

export type HandTool = Tool & {
  holding: boolean
}

export function makeHandTool(ctx: ToolCtx): HandTool {
  return {
    holding: false,
    ...ctx,
    toolname: "hand",
    panel() {
      return (
        <div>
          Zoom level:
          <input
            type="number"
            min={0}
            max={500}
            step={10}
            value={Math.round(this.project.viewBoxZoom * 100)}
            onChange={ev => {
              this.project.viewBoxZoom = +ev.target.value / 100;
              this.updateProject();
              this.update();
            }}
          />
          %
        </div>
      )
    },
    onEvent(ev) {
      switch (ev.type) {
        case "mousedown":
          this.holding = true;
          break;
        case "mouseup":
          this.holding = false;
          break;
        case "mousemove":
          if (this.holding) {
            this.project.viewBoxX -= ev.movement.x / this.project.viewBoxZoom;
            this.project.viewBoxY -= ev.movement.y / this.project.viewBoxZoom;
            this.updateProject();
          }
          break;
      }
    },
    svgElements() { return <></> },
  }
}
