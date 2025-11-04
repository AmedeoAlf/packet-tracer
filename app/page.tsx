"use client";
import { Editor } from "./Editor";
import { Project } from "./Project";

export default function Home() {
  const proj = new Project();
  proj.createDevice("router", { x: 100, y: 100 })
  proj.createDevice("router", { x: 50, y: 300 })
  proj.createDevice("switch", { x: 150, y: 350 })
  proj.createDevice("router", { x: 50, y: 50 })
  proj.createDevice("router", { x: 200, y: 50 })
  return Editor(proj);
}
