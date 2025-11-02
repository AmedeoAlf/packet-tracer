"use client";
import { Router } from "./devices/Router";
import { Editor } from "./Editor";
import { Project } from "./Project";

export default function Home() {
  const proj = new Project();
  proj.createDevice("router", { x: 100, y: 100 })
  proj.createDevice("router", { x: 0, y: 0 })
  proj.createDevice("router", { x: 150, y: 50 })
  proj.createDevice("router", { x: 50, y: 50 })
  proj.createDevice("router", { x: 200, y: 50 })
  return Editor(proj);
}
