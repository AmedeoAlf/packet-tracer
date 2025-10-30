"use client";
import { useState } from "react";
import { Project } from "../Project";
import { Tool, CanvasEvent } from "./Tool";
import { deviceTypesDB } from "../devices/Device";
import { todo } from "node:test";


export class AddTool extends Tool {
  name = "add";
  deviceType: keyof typeof deviceTypesDB;
  private setDeviceType: (t: typeof this.deviceType) => void;
  panel = () => {
    return (
      <p>WIP</p>
    )
  };
  onEvent(ev: CanvasEvent): void {
    switch (ev.type) {
      case "click":
        todo("Unimplemented");
        break;
    }
  }
  constructor(project: Project, setProject: (p: Project) => void) {
    super(project, setProject);
    const state = useState("");
    this.deviceType = state[0];
    this.setDeviceType = state[1];
  }
}

