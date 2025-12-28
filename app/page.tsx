"use client";
import { useMemo, useState } from "react";
import { RouterInternalState } from "./devices/list/Router";
import { parseIpv4 } from "./protocols/rfc_760";
import { ProjectManager } from "./ProjectManager";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("./Editor").then((m) => m.Editor), {
  ssr: false,
});

function defaultProject(): ProjectManager {
  const p = new ProjectManager();
  p.addDecal({
    type: "text",
    text: "This is an example project",
    pos: { x: -300, y: -250 },
  });
  p.createDevice("switch", { x: -300, y: -100 }, "Rete A");
  p.createDevice("router", { x: -150, y: -100 }, "Router A");

  p.createDevice("router", { x: -50, y: -200 }, "Internet A");
  (p.mutDevice(p.lastId)?.internalState as RouterInternalState).l3Ifs[3] = {
    ip: parseIpv4("1.1.1.1")!,
    mask: parseIpv4("255.255.255.0")!,
  };

  p.createDevice("router", { x: -50, y: -100 }, "Internet B");
  p.mutDevice(p.lastId)?.internalState.netInterfaces.push({
    name: "se2",
    maxMbps: 100,
    type: "serial",
    mac: 0x102030405060,
  });
  (p.mutDevice(p.lastId)?.internalState as RouterInternalState).l3Ifs[3] = {
    ip: parseIpv4("1.1.1.2")!,
    mask: parseIpv4("255.255.255.0")!,
  };

  p.createDevice("router", { x: -50, y: 0 }, "Internet C");
  p.createDevice("router", { x: 50, y: 0 }, "Router B");
  p.createDevice("switch", { x: 200, y: -100 }, "Rete B");
  console.assert(p.connect(1, 0, 2, 0) == undefined); // "Rete A" -> "Router A"
  console.assert(p.connect(2, 2, 3, 2) == undefined); // "Router A" -> "Internet A"
  console.assert(p.connect(2, 3, 4, 2) == undefined); // "Router A" -> "Internet B"
  console.assert(p.connect(3, 3, 4, 3) == undefined); // "Internet A" -> "Internet B"
  console.assert(p.connect(4, 4, 5, 2) == undefined); // "Internet B" -> "Internet C"
  console.assert(p.connect(5, 3, 6, 2) == undefined); // "Internet C" -> "Router B"
  console.assert(p.connect(6, 0, 7, 0) == undefined); // "Router B" -> "Rete B"
  return new ProjectManager(p);
}

function loadSavedProject(): ProjectManager | undefined {
  try {
    const saved = localStorage.getItem("project");
    if (saved == null) return;
    const json = JSON.parse(saved);
    if (typeof json !== "object") return;
    return ProjectManager.fromSerialized(json);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {}
}

export default function Home() {
  const proj = useMemo(() => loadSavedProject() ?? defaultProject(), []);

  const [isSaved, setIsSaved] = useState(true);
  return (
    <Editor
      initialProject={proj}
      isSaved={isSaved}
      save={(proj) => {
        setIsSaved(false);
        localStorage.setItem("project", JSON.stringify(proj.exportProject()));
        setIsSaved(true);
        // navigator
        //   .clipboard
        //   .writeText(JSON.stringify(proj.exportProject()))
        //   .then(() => setIsSaved(true));
      }}
    />
  );
}
