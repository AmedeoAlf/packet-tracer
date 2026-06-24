import { AnyTool, Tool, ToolConstructor } from "./Tool";
import { Coords, doRectsOverlap, pointInRect, rectBetween } from "../common";
import { Device } from "../devices/Device";
import { Decal } from "../Project";
import onEvent from "./SelectTool/onEvent";
import SelectToolPanel from "./SelectTool/SelectToolPanel";

export type SelectTool = Tool<SelectTool> & {
  selected: Set<number>;
  selectedDecals: Set<number>;
  lastCursorPos?: Coords;
  movedSelection: boolean;
  // User is in rectangle selection if this is not undefined
  selectionRectangle?: Coords;
  stdout: string;
  stdin: string;
  previousCmds: string[];

  currDevicePanel?: string;
  selectingDevicePanel: boolean;
};

export function isSelectTool(tool: AnyTool | object): tool is SelectTool {
  return "toolname" in tool && tool.toolname == "select";
}

export function isDeviceHighlighted(tool: SelectTool, dev: Device) {
  if (tool.selected.has(dev.id)) return true;
  if (!tool.lastCursorPos || !tool.selectionRectangle) return false;

  return pointInRect(
    dev.pos,
    rectBetween(tool.lastCursorPos, tool.selectionRectangle),
  );
}

export function isDecalHighlighted(tool: SelectTool, dec: Decal) {
  if (tool.selectedDecals.has(dec.id)) return true;
  if (!tool.lastCursorPos || !tool.selectionRectangle) return false;

  const selection = rectBetween(tool.lastCursorPos, tool.selectionRectangle);
  return dec.type == "rect"
    ? doRectsOverlap(selection, [...dec.pos, ...dec.size])
    : pointInRect(dec.pos, selection);
}

export const makeSelectTool: ToolConstructor<SelectTool> = (
  prev: SelectTool | object = {},
): SelectTool => {
  return {
    selected: new Set<number>(),
    selectedDecals: new Set<number>(),
    stdin: "",
    stdout: "= Terminal emulator =",
    lastCursorPos: undefined,
    previousCmds: [],
    selectingDevicePanel: true,
    ...prev,
    movedSelection: false,
    toolname: "select",
    svgElements: (ctx) => {
      if (!ctx.tool.selectionRectangle || !ctx.tool.lastCursorPos) return <></>;
      const props = {
        x: Math.min(ctx.tool.selectionRectangle[0], ctx.tool.lastCursorPos[0]),
        y: Math.min(ctx.tool.selectionRectangle[1], ctx.tool.lastCursorPos[1]),
        width: Math.abs(
          ctx.tool.selectionRectangle[0] - ctx.tool.lastCursorPos[0],
        ),
        height: Math.abs(
          ctx.tool.selectionRectangle[1] - ctx.tool.lastCursorPos[1],
        ),
      };
      return (
        <rect {...props} className="fill-blue-400/10 stroke-blue-200" rx={6} />
      );
    },
    panel: SelectToolPanel,
    onEvent,
  };
};
