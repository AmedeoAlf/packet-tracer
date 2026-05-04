"use client";
import { RefObject, useMemo, useState } from "react";
import { RouterInternalState } from "./devices/list/Router";
import { parseIpv4 } from "./protocols/rfc_760";
import { ProjectManager } from "./ProjectManager";
import dynamic from "next/dynamic";
import { isRecord } from "./common";
const Editor = dynamic(() => import("./Editor").then((m) => m.Editor), {
  ssr: false,
});

export default function Home() {
  // eslint-disable-next-line react-hooks/purity
  const [startTime] = useState(Date.now());
  const tickRef: RefObject<number> = useMemo(
    () =>
      Object.create(null, {
        current: {
          get() {
            // eslint-disable-next-line react-hooks/purity
            return Date.now() - startTime;
          },
        },
      }),
    [startTime],
  );
  const proj = useMemo(
    () => loadSavedProject(tickRef) ?? defaultProject(tickRef),
    [tickRef],
  );

  const [isSaved, setIsSaved] = useState(true);
  return (
    <Editor
      initialProject={proj}
      isSaved={isSaved}
      tickRef={tickRef}
      save={(proj) => {
        setIsSaved(false);
        const exported = proj.exportProject();
        localStorage.setItem("project:v0", JSON.stringify(exported));
        setIsSaved(true);
        // navigator
        //   .clipboard
        //   .writeText(JSON.stringify(proj.exportProject()))
        //   .then(() => setIsSaved(true));
      }}
    />
  );
}

function loadSavedProject(
  tickRef: ProjectManager["tickRef"],
): ProjectManager | undefined {
  try {
    {
      const oldLocalStorage = localStorage.getItem("project");
      if (oldLocalStorage != null) {
        localStorage.setItem("project:v0", oldLocalStorage);
        localStorage.removeItem("project");
      }
    }
    const saved = localStorage.getItem("project:v0");
    if (saved == null) return;
    const json = JSON.parse(saved);
    if (!isRecord(json)) return;
    return ProjectManager.fromSerialized(json, tickRef);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {}
}

function defaultProject(tickRef: ProjectManager["tickRef"]): ProjectManager {
  const p = ProjectManager.make(tickRef);
  p.addDecal({
    type: "text",
    text: "This is an example project",
    pos: [-300, -250],
    fg: 0,
  });
  p.createDevice("switch", [-300, -100], "Rete A");
  p.createDevice("router", [-150, -100], "Router A");

  p.createDevice("router", [-50, -200], "Internet A");
  (p.mutDevice(p.lastId)?.internalState as RouterInternalState).l3Ifs[3] = {
    ip: parseIpv4("1.1.1.1")!,
    mask: parseIpv4("255.255.255.0")!,
  };

  p.createDevice("router", [-50, -100], "Internet B");
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

  p.createDevice("router", [-50, 0], "Internet C");
  p.createDevice("router", [50, 0], "Router B");
  p.createDevice("switch", [200, -100], "Rete B");
  console.assert(p.connect(1, 0, 2, 0) == undefined); // "Rete A" -> "Router A"
  console.assert(p.connect(2, 2, 3, 2) == undefined); // "Router A" -> "Internet A"
  console.assert(p.connect(2, 3, 4, 2) == undefined); // "Router A" -> "Internet B"
  console.assert(p.connect(3, 3, 4, 3) == undefined); // "Internet A" -> "Internet B"
  console.assert(p.connect(4, 4, 5, 2) == undefined); // "Internet B" -> "Internet C"
  console.assert(p.connect(5, 3, 6, 2) == undefined); // "Internet C" -> "Router B"
  console.assert(p.connect(6, 0, 7, 0) == undefined); // "Router B" -> "Rete B"
  return p.newInstance();
}
