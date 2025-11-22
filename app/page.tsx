"use client";
import { useMemo } from "react";
import { Editor } from "./Editor";
import { Project } from "./Project";

export default function Home() {
  const proj = useMemo(() => {
    const p = new Project();
    p.createDevice("switch", { x: -300, y: -100 }, "Rete A")
    p.createDevice("router", { x: -150, y: -100 }, "Router A")
    p.createDevice("router", { x: -50, y: -200 }, "Internet A")
    p.createDevice("router", { x: -50, y: -100 }, "Internet B")
    p.devices.get(p.lastId)?.internalState.netInterfaces.push({ name: "se2", maxMbps: 100, type: "serial", mac: 0x102030405060 })
    p.createDevice("router", { x: -50, y: 0 }, "Internet C")
    p.createDevice("router", { x: 50, y: 0 }, "Router B")
    p.createDevice("switch", { x: 200, y: -100 }, "Rete B")
    console.assert(p.connect(1, 0, 2, 0) == undefined) // "Rete A" -> "Router A"
    console.assert(p.connect(2, 2, 3, 2) == undefined) // "Router A" -> "Internet A"
    console.assert(p.connect(2, 3, 4, 2) == undefined) // "Router A" -> "Internet B"
    console.assert(p.connect(3, 3, 4, 3) == undefined) // "Internet A" -> "Internet B"
    console.assert(p.connect(4, 4, 5, 2) == undefined) // "Internet B" -> "Internet C"
    console.assert(p.connect(5, 3, 6, 2) == undefined) // "Internet C" -> "Router B"
    console.assert(p.connect(6, 0, 7, 0) == undefined) // "Router B" -> "Rete B"
    return p;
  }, [0]);
  return Editor(proj);
}
