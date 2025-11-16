"use client";
import { useMemo } from "react";
import { Editor } from "./Editor";
import { Project } from "./Project";

export default function Home() {
  const proj = useMemo(() => {
    const p = new Project();
    p.createDevice("router", { x: 100, y: 100 })
    p.createDevice("router", { x: 50, y: 300 })
    p.createDevice("switch", { x: 150, y: 350 })
    p.createDevice("switch", { x: 250, y: 350 })
    p.createDevice("router", { x: 50, y: 50 })
    p.createDevice("router", { x: 200, y: 50 })
    console.assert(p.connect(1, 0, 2, 0) != undefined)
    console.assert(p.connect(3, 0, 2, 1) != undefined)
    console.assert(p.connect(3, 1, 4, 0) != undefined)
    console.assert(p.connect(3, 2, 5, 0) != undefined)
    console.assert(p.connect(3, 3, 6, 0) != undefined)
    return p;
  }, [0]);
  return Editor(proj);
}
