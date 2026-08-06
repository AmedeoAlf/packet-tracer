"use client";
import { Device } from "../devices/Device";
import { Coords } from "../common";
import { Decal, ProjectManager } from "../Project";
import { ReactNode, RefObject } from "react";
import { makeSelectTool } from "./SelectTool";
import { makeAddTool } from "./AddTool";
import { makeHandTool } from "./HandTool";
import { makeConnectTool } from "./ConnectTool";
import { makeLabelTool } from "./LabelTool";
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

export interface Tool<TSelf extends Tool<TSelf>> {
  toolname: keyof typeof TOOLS;
  onEvent: (ctx: ToolCtx<TSelf>, ev: CanvasEvent) => void;
  panel: (ctx: ToolCtx<TSelf>) => ReactNode | undefined;
  svgElements: (ctx: ToolCtx<TSelf>) => ReactNode;
  initialTooltip: ReactNode | ((ctx: ToolCtx<TSelf>) => ReactNode);
}

export class ToolCtx<T extends Tool<T> = AnyTool> {
  constructor(
    public project: ProjectManager,
    public projectRef: RefObject<ProjectManager>,
    private setProject: (p: ProjectManager) => void,
    private queueSave: () => void,
    private addToHistory: (p: ProjectManager) => void,

    public tool: T,
    public toolRef: RefObject<T>,
    private setToolTo: (t: AnyTool) => void,

    private lastTool: keyof typeof TOOLS,
    private setLastTool: (t: keyof typeof TOOLS) => void,
    public setTooltip: (s: ReactNode) => void,
  ) {}

  // Triggers a React rerender with changes applied to project
  updateProject(save?: boolean) {
    const inst = this.projectRef.current.newInstance();
    this.setProject(inst);
    this.queueSave();
    if (save) this.addToHistory(inst);
  }

  // Triggers a React rerender with changes applied to the ctx, any further edit won't be applied
  updateTool() {
    this.setToolTo({ ...this.toolRef.current });
  }

  // Revert to last tool
  // invalidates type parameter T
  revertTool() {
    if (this.lastTool == this.tool.toolname) return;
    (this.toolRef.current as AnyTool) = TOOLS[this.lastTool](
      this.toolRef.current,
      this.projectRef.current,
    );
    this.updateTool();
  }

  // invalidates type parameter T
  setTool(t: keyof typeof TOOLS, withAnchor?: boolean) {
    if (withAnchor) this.setLastTool(t);
    (this.toolRef.current as AnyTool) = TOOLS[t](
      this.toolRef.current,
      this.projectRef.current,
    );
    this.setTooltip(
      this.toolRef.current.initialTooltip instanceof Function
        ? this.toolRef.current.initialTooltip(this)
        : this.toolRef.current.initialTooltip,
    );
    this.updateTool();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = Tool<any>;

export type ToolConstructor<T extends Tool<T>> = (
  prev: Tool<T> | object,
  project: ProjectManager,
) => T;

export const TOOLS = {
  select: makeSelectTool,
  add: makeAddTool,
  hand: makeHandTool,
  connect: makeConnectTool,
  label: makeLabelTool,
  rect: makeRectTool,
} as const;

export const TOOL_LIST = [
  "select",
  "add",
  "hand",
  "connect",
  "label",
  "rect",
] as const satisfies (keyof typeof TOOLS)[];
