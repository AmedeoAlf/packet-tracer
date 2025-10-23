"use client";
import { Device } from "./Device";
import { Coords } from "./common";
import { Project } from "./Project";
import { Dispatch, SetStateAction, useState } from "react";

export type CanvasEvent = ({
  type: "mousemove";
  movement: Coords;
} | {
  type: "click" | "mousedown" | "mouseup";
}) & {
  shiftKey: boolean;
  pos: Coords;
  device?: Device;
}

export abstract class Tool {
  abstract name: string;
  abstract onEvent(ev: CanvasEvent): void;
  project: Project;
  setProject: (p: Project) => void;
  constructor(project: Project, setProject: (p: Project) => void) {
    this.project = project;
    this.setProject = setProject;
  }
}

export class SelectTool extends Tool {
  name = "select";
  selected: Set<number>;
  setSelected: Dispatch<SetStateAction<Set<number>>>;
  lastCursorPos?: Coords;
  onEvent(ev: CanvasEvent): void {
    switch (ev.type) {
      case "click":
        if (ev.device) {
          if (!ev.shiftKey) {
            this.setSelected(new Set());
          } else {
            console.log("append", ...this.selected)
          }
          this.setSelected(new Set(this.selected.add(ev.device.id)));
        } else {
          this.setSelected(new Set());
        }
        break;
      case "mousedown":
        if (!ev.device) {
          this.selected.clear();
          return;
        }
        if (!ev.shiftKey && !this.selected.has(ev.device.id)) {
          this.selected.clear();
        }
        this.setSelected(new Set(this.selected.add(ev.device.id)));
        this.lastCursorPos = this.selected.size != 0 ? ev.pos : undefined;
        console.log("Mousedown", ev.pos.x, ev.pos.y, ...this.selected);
        break;
      case "mousemove":
        if (this.lastCursorPos) {
          const translated = new Project(this.project);
          for (const dev of this.selected) {
            translated.devices.get(dev)!!.pos.x += ev.pos.x - this.lastCursorPos.x;
            translated.devices.get(dev)!!.pos.y += ev.pos.y - this.lastCursorPos.y;
          }
          this.setProject(translated);
          this.lastCursorPos = ev.pos;
        }
        break;
      case "mouseup":
        // console.log("Mouseup", ev.pos, this.dragging_from, ev.device);
        if (this.lastCursorPos) {
          const translated = new Project(this.project);
          for (const dev of this.selected) {
            translated.devices.get(dev)!!.pos.x += ev.pos.x - this.lastCursorPos.x;
            translated.devices.get(dev)!!.pos.y += ev.pos.y - this.lastCursorPos.y;
          }
          this.setProject(translated);
        }
        this.lastCursorPos = undefined;
        // console.log(
        //   [
        //     ...this.project.devices.values().map((it) =>
        //       `${it.id} ${it.pos.x} ${it.pos.y}`
        //     ),
        //   ].join("\n"),
        // );
        break;
    }
  }
  constructor(project: Project, setProject: (p: Project) => void) {
    super(project, setProject);
    const t = useState(new Set<number>());
    this.selected = t[0];
    this.setSelected = t[1];
  }
}

