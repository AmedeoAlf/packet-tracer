"use client";
import { Device } from "../devices/Device";
import { Coords } from "../common";
import { Project } from "../Project";
import { JSX } from "react";

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

export abstract class Tool {
  abstract name: string;
  abstract onEvent(ev: CanvasEvent): void;
  abstract panel: () => JSX.Element;
  project: Project;
  setProject: (p: Project) => void;
  constructor(project: Project, setProject: (p: Project) => void) {
    this.project = project;
    this.setProject = setProject;
  }
}


