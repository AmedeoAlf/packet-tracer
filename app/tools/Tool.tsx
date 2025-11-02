"use client";
import { Device } from "../devices/Device";
import { Coords } from "../common";
import { Project } from "../Project";
import { JSX, ReactNode } from "react";

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
  updateProject: () => void,
  update: () => void
}
export type Tool = {
  readonly toolname: string;
  readonly onEvent: (ctx: ToolCtx, ev: CanvasEvent) => void;
  readonly panel: (ctx: ToolCtx) => JSX.Element;
  readonly svgElements: (ctx: ToolCtx) => ReactNode;
  ctx?: ToolCtx;
  make: (ctx: ToolCtx) => Tool
}
