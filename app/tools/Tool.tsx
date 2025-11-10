"use client";
import { Device } from "../devices/Device";
import { Coords } from "../common";
import { Project } from "../Project";
import { ReactNode } from "react";

export type CanvasEvent = ({
  type: "mousemove";
  movement: Coords;
} | {
  type: "click" | "mousedown" | "mouseup" | "doubleclick";
}) & {
  shiftKey: boolean;
  pos: Coords;
  device?: Device;
}

export type ToolCtx = {
  project: Project,
  // Triggers a React rerender with changes applied to project
  updateProject: () => void,
  // Triggers a React rerender with changes applied to the ctx, any further edit won't be applied
  update: () => void
}

export type Tool = {
  readonly toolname: string;
  readonly onEvent: (ctx: ToolCtx, ev: CanvasEvent) => void;
  readonly panel: (ctx: ToolCtx) => ReactNode;
  readonly svgElements: (ctx: ToolCtx) => ReactNode;
  ctx?: ToolCtx;
  bind: (ctx: ToolCtx) => Tool
}
