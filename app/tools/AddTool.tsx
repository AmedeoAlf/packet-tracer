import { Tool, ToolCtx } from "./Tool";
import { DeviceType, deviceTypesDB } from "../devices/deviceTypesDB";
import { Coords } from "../common";

export type AddTool = Tool & {
  deviceType: keyof typeof deviceTypesDB;
  cursorPos: Coords;
}

export function makeAddTool(ctx: ToolCtx): AddTool {
  return {
    cursorPos: { x: 0, y: 0 },
    deviceType: Object.keys(deviceTypesDB)[0] as DeviceType,
    ...ctx,
    toolname: "add",
    panel() {
      return (
        <div>
          Device type:
          <select
            defaultValue={this.deviceType}
            onChange={ev => { this.deviceType = ev.target.value as DeviceType; this.update() }} >
            {Object.keys(deviceTypesDB).map(it => (<option className="bg-sky-700" key={it} value={it}>{it}</option>))}
          </select>
        </div>
      )
    },
    onEvent(ev): void {
      switch (ev.type) {
        case "click":
          this.project.createDevice(this.deviceType, ev.pos);
          this.updateProject();
          break;
        case "mousemove":
          this.cursorPos = ev.pos;
          this.update();
          break;
      }
    },
    svgElements() {
      return (
        <use
          href={deviceTypesDB[this.deviceType].proto.iconId}
          className="opacity-50"
          {...this.cursorPos}
        />
      )
    },
  }
}
