"use client";
import { Device } from "../devices/Device";
import { Coords } from "../common";
import { Decal } from "../Project";
import { ReactNode, RefObject } from "react";
import { makeSelectTool } from "./SelectTool";
import { makeAddTool } from "./AddTool";
import { makeHandTool } from "./HandTool";
import { makeConnectTool } from "./ConnectTool";
import { makeLabelTool } from "./LabelTool";
import { ProjectManager } from "../ProjectManager";
import { makeRectTool } from "./RectTool";

export type CanvasEvent =
  | ((
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
    })
  | ({
      key: string;
      shift: boolean;
      ctrl: boolean;
      consumed: boolean;
    } & { type: "keydown" | "keyup" });

export type Tool<Ext extends object> = {
  readonly toolname: keyof typeof TOOLS;
  readonly onEvent: (ctx: ToolCtx<Tool<Ext>>, ev: CanvasEvent) => void;
  readonly panel: (ctx: ToolCtx<Tool<Ext>>) => ReactNode;
  readonly svgElements: (ctx: ToolCtx<Tool<Ext>>) => ReactNode;
} & Ext;

export type ToolCtx<T extends Tool<any>> = {
  project: ProjectManager;
  // Triggers a React rerender with changes applied to project
  updateProject: () => void;

  tool: T;
  toolRef: RefObject<T>;
  // Triggers a React rerender with changes applied to the ctx, any further edit won't be applied
  updateTool: () => void;
};
export const TOOLS = {
  select: makeSelectTool,
  add: makeAddTool,
  hand: makeHandTool,
  connect: makeConnectTool,
  label: makeLabelTool,
  rect: makeRectTool,
} satisfies Record<string, (ctx: ToolCtx<Tool<any>>) => Tool<any>>;

export const TOOL_LIST = [
  "select",
  "add",
  "hand",
  "connect",
  "label",
  "rect",
] as const satisfies (keyof typeof TOOLS)[];
