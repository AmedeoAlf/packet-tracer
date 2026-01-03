import { Tool } from "./Tool";
import { DeviceType, deviceTypesDB } from "../devices/deviceTypesDB";
import { Coords } from "../common";

export type AddTool = Tool<{
  deviceType: keyof typeof deviceTypesDB;
  cursorPos: Coords;
}>;

export function makeAddTool(prev: AddTool | object = {}): AddTool {
  return {
    cursorPos: { x: 0, y: 0 },
    deviceType: Object.keys(deviceTypesDB)[0] as DeviceType,
    ...prev,
    toolname: "add",
    panel: (ctx) => {
      return (
        <div>
          Device type:
          <select
            defaultValue={ctx.tool.deviceType}
            onChange={(ev) => {
              ctx.tool.deviceType = ev.target.value as DeviceType;
              ctx.updateTool();
            }}
          >
            {Object.keys(deviceTypesDB).map((it) => (
              <option className="bg-sky-700" key={it} value={it}>
                {it}
              </option>
            ))}
          </select>
        </div>
      );
    },
    onEvent: (ctx, ev) => {
      switch (ev.type) {
        case "click":
          ctx.project.createDevice(ctx.tool.deviceType, ev.pos);
          ctx.updateProject();
          break;
        case "mousemove":
          ctx.tool.cursorPos = ev.pos;
          ctx.updateTool();
          break;
      }
    },
    svgElements: (ctx) => {
      return (
        <use
          href={deviceTypesDB[ctx.tool.deviceType].proto.iconId}
          className="opacity-50"
          {...ctx.tool.cursorPos}
        />
      );
    },
  };
}
