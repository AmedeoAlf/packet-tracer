"use client";
import { Editor } from "./Editor";
import { Device } from "./Device";
import { Project } from "./Project";

export default function Home() {
  const proj = new Project();
  proj.devices.set(0, new Device(0, { x: 100, y: 100 }, "#router-icon"));
  proj.devices.set(1, new Device(1, { x: 0, y: 0 }, "#router-icon"));
  proj.devices.set(2, new Device(2, { x: 150, y: 50 }, "#router-icon"));
  proj.devices.set(3, new Device(3, { x: 50, y: 50 }, "#router-icon"));
  proj.devices.set(4, new Device(4, { x: 200, y: 50 }, "#router-icon"));
  return Editor(proj);
}
