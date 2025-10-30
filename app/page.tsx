"use client";
import { Router } from "./devices/Router";
import { Editor } from "./Editor";
import { Project } from "./Project";

export default function Home() {
  const proj = new Project();
  proj.devices = new Map(
    [
      new Router(0, { x: 100, y: 100 }, "a"),
      new Router(1, { x: 0, y: 0 }, "b"),
      new Router(2, { x: 150, y: 50 }, "c"),
      new Router(3, { x: 50, y: 50 }, "d"),
      new Router(4, { x: 200, y: 50 }, "e"),
    ].map(it => [it.id, it])
  )
  return Editor(proj);
}
