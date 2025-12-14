"use client";
import { Device } from "../devices/Device";
import { Coords } from "../common";
import { Decal } from "../Project";
import { ReactNode } from "react";
import { makeSelectTool } from "./SelectTool";
import { makeAddTool } from "./AddTool";
import { makeHandTool } from "./HandTool";
import { makeConnectTool } from "./ConnectTool";
import { makeLabelTool } from "./LabelTool";
import { ProjectManager } from "../ProjectManager";
import { makeRectTool } from "./RectTool";

export type CanvasEvent = (
  | {
      type: "mousemove";
      movement: Coords;
    }
  | {
      type:
        | "click"
        | "mousedown"
        | "mouseup"
        | "doubleclick"
        | "mouseenter"
        | "mouseleave";
    }
) & {
  shiftKey: boolean;
  pos: Coords;
  device?: Device;
  decal?: Decal;
};

export type Tool = ToolCtx & {
  readonly toolname: keyof typeof TOOLS;
  readonly onEvent: (ev: CanvasEvent) => void;
  readonly panel: () => ReactNode;
  readonly svgElements: () => ReactNode;
};

export type ToolCtx = {
  project: ProjectManager;
  // Triggers a React rerender with changes applied to project
  updateProject: () => void;
  // Triggers a React rerender with changes applied to the ctx, any further edit won't be applied
  update: () => void;
};
export const TOOLS = {
  select: makeSelectTool,
  add: makeAddTool,
  hand: makeHandTool,
  connect: makeConnectTool,
  label: makeLabelTool,
  rect: makeRectTool,
} satisfies Record<string, (ctx: ToolCtx) => Tool>;

export const TOOL_LIST = [
  "select",
  "add",
  "hand",
  "connect",
  "label",
  "rect",
] as const satisfies (keyof typeof TOOLS)[];
