/* eslint-disable react-hooks/immutability */
"use client";
import {
  useState,
  useRef,
  MouseEvent,
  useEffect,
  ReactNode,
  useMemo,
  memo,
  KeyboardEvent,
} from "react";
import { CanvasEvent, Tool, TOOLS } from "./tools/Tool";
import { makeSelectTool, SelectTool } from "./tools/SelectTool";
import { ICONS } from "./devices/ICONS";
import { Cables } from "./editorComponents/Cables";
import { SideBar } from "./editorComponents/SideBar";
import { ToolSelector } from "./editorComponents/ToolSelector";
import { Devices } from "./editorComponents/Devices";
import { deviceTypesDB } from "./devices/deviceTypesDB";
import { ProjectManager } from "./ProjectManager";
import { Decal } from "./Project";

/*
 * Questo componente è tutta l'interfaccia del sito. Crea gli hook sia per il
 * `ProjectManager` che il `Tool` in uso, pertanto viene rirenderizzato ad ogni
 * cambiamento di questi.
 */
export function Editor(p: ProjectManager): ReactNode {
  const [proj, setProject] = useState(p);
  const [tool, setTool] = useState<Tool>(
    makeSelectTool({
      project: proj,
      updateProject: () => setProject(new ProjectManager(proj)),
      update: () => {},
    }),
  );
  tool.project = proj;
  tool.updateProject = () => {
    setProject(new ProjectManager(proj));
  };
  tool.update = () => {
    setTool({ ...tool });
  };

  const svgCanvas = useRef<SVGSVGElement>(null);
  let pt = svgCanvas.current?.createSVGPoint();

  const [canvasSize, setCanvasSize] = useState<[number, number] | undefined>(
    undefined,
  );

  function svgToDOMPoint(x: number, y: number): DOMPoint | undefined {
    if (!pt) return;
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(svgCanvas.current!.getScreenCTM()!.inverse());
  }

  const mouseHandler = buildMouseEventHandler.bind(null, svgToDOMPoint, tool);

  useEffect(() => {
    window.onresize = () => setCanvasSize(undefined);
    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) e.preventDefault();
      },
      { passive: false },
    );
  }, []);

  const svgViewBox = useMemo(() => {
    const vb = [proj.viewBoxX, proj.viewBoxY, 10000, 10000];
    if (canvasSize) {
      vb[2] = canvasSize[0] / proj.viewBoxZoom;
      vb[3] = canvasSize[1] / proj.viewBoxZoom;
      vb[0] -= vb[2] * 0.5;
      vb[1] -= vb[3] * 0.5;
    }
    return vb;
  }, [canvasSize, proj.viewBoxZoom, proj.viewBoxX, proj.viewBoxY]);

  return (
    <div
      onKeyDown={buildKeyboardEventHandler(tool, "keydown")}
      onKeyUp={buildKeyboardEventHandler(tool, "keyup")}
      tabIndex={0}
    >
      <div className="bg-sky-700 fixed top-0 w-full h-[50px] indent-1.5em border-b-[.1em] border-solid border-sky-800"></div>

      <SideBar tool={tool} />

      <div
        id="left-side-bar"
        className="fixed bottom-0 left-0 w-[35.3%] h-[150px] indent-[1,5em] border-solid border-t-[.1em] border-r-[.1em] border-sky-800"
      >
        <div className="h-[20%] bg-sky-700"></div>
        <div className="h-[80%] bg-zinc-900 flex flex-wrap justify-center">
          {Object.values(deviceTypesDB).map((it) => (
            <button
              className="h-16 w-16 m-[2.5%] border-solid border-[.1em] border-white"
              key={it.proto.deviceType}
            >
              <svg
                viewBox="-35 -35 70 70"
                onClick={() => {
                  proj.createDevice(it.proto.deviceType, {
                    x: (proj.lastId % 5) * 100 - 600,
                    y: Math.floor(proj.lastId / 5) * 100 - 350,
                  });
                  tool.updateProject();
                }}
              >
                {ICONS[it.proto.iconId]}
                {/* il bordo che devono rispettare le icone dopo l'applicazione di scale() e traslate()
                    <rect x="-30" y="-30" width="60" height="60" stroke="red" fill="none" />*/}
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div
        id="right-side-bar"
        className="fixed bottom-0 right-0 w-[35.3%] h-[150px] indent-[1,5em] border-solid border-t-[.1em] border-l-[.1em] border-sky-800"
      >
        <div className="h-[20%] bg-sky-700"></div>
        <div className="h-[80%] bg-zinc-900 flex flex-wrap justify-center">
          {[0, 1, 2, 3, 4].map((k) => (
            <button
              className="h-16 w-16 border-solid border-[.1em] border-white m-[2.5%] "
              key={k}
            ></button>
          ))}
        </div>
      </div>

      <ToolSelector
        tool={tool}
        setToolTo={(name) => setTool(TOOLS[name](tool))}
      />

      <svg
        onClick={mouseHandler("click")}
        onDoubleClick={mouseHandler("doubleclick")}
        onMouseUp={mouseHandler("mouseup")}
        onMouseDown={mouseHandler("mousedown")}
        onMouseMove={mouseHandler("mousemove")}
        onMouseEnter={mouseHandler("mouseenter")}
        onMouseLeave={mouseHandler("mouseleave")}
        onWheel={(ev) => {
          if (ev.ctrlKey) {
            const from = tool.project.viewBoxZoom;
            tool.project.viewBoxZoom *= 1 + ev.deltaY * -0.0005;
            // devono entrambe non essere undefined per chiamare svgToDOMPoint
            if (canvasSize && pt) {
              const factor = from / tool.project.viewBoxZoom;

              const cursor = svgToDOMPoint(ev.clientX, ev.clientY)!;
              const center = svgToDOMPoint(
                canvasSize[0] / 2,
                canvasSize[1] / 2,
              )!;

              tool.project.viewBoxX += (cursor.x - center.x) * (1 - factor);
              tool.project.viewBoxY += (cursor.y - center.y) * (1 - factor);
            }
            tool.updateProject();
            tool.update();
          } else if (ev.shiftKey) {
            tool.project.viewBoxX += ev.deltaY / tool.project.viewBoxZoom;
            tool.updateProject();
            // tool.update()
          } else {
            tool.project.viewBoxX += ev.deltaX / tool.project.viewBoxZoom;
            tool.project.viewBoxY += ev.deltaY / tool.project.viewBoxZoom;
            tool.updateProject();
            // tool.update()
          }
        }}
        className={`bg-${svgCanvas.current ? "gray-700" : "gray-100"} -z-1 w-full h-screen transition-colors select-none`}
        viewBox={svgViewBox.join(" ")}
        ref={(svg) => {
          svgCanvas.current = svg;
          pt = svgCanvas.current?.createSVGPoint();
          if (svgCanvas.current) {
            const rect = svgCanvas.current.getBoundingClientRect();
            if (
              !canvasSize ||
              rect.width != canvasSize[0] ||
              rect.height != canvasSize[1]
            )
              setCanvasSize([rect.width, rect.height]);
          }
        }}
      >
        <defs> {Object.values(ICONS)} </defs>
        <Decals
          decals={proj.immutableDecals}
          highlighted={
            tool.toolname == "select"
              ? (tool as SelectTool).selectedDecals
              : undefined
          }
        />
        <Cables devices={proj.immutableDevices} cables={proj.getCables()} />
        {tool.svgElements()}
        <Devices
          devices={proj.immutableDevices}
          highlighted={
            tool.toolname == "select"
              ? (tool as SelectTool).selected
              : undefined
          }
        />
      </svg>
    </div>
  );
}

// buildEventHandler per eventi "keydown" e "keyup"
function buildKeyboardEventHandler(
  tool: Tool,
  type: Extract<CanvasEvent["type"], "keydown" | "keyup">,
) {
  return (ev: KeyboardEvent<HTMLDivElement>) => {
    const evObj = {
      type,
      key: ev.key,
      ctrl: ev.ctrlKey,
      shift: ev.shiftKey,
      consumed: false,
    };
    tool.onEvent(evObj);
    if (evObj.consumed) ev.preventDefault();
  };
}

// Ritorna una funzione che chiama `tool.onEvent(event)` con un oggetto
// `CanvasEvent`, costruito a partire dal tipo di evento DOM specificato
function buildMouseEventHandler(
  toDOMPoint: (x: number, y: number) => DOMPoint | undefined,
  tool: Tool,
  type: Exclude<CanvasEvent["type"], "keydown" | "keyup">,
): (ev: MouseEvent) => void {
  const getPos = (ev: MouseEvent) => {
    const result = toDOMPoint(ev.clientX, ev.clientY);
    return result ? { x: result.x, y: result.y } : { x: 0, y: 0 };
  };

  if (type == "mousemove") {
    return (ev: MouseEvent) => {
      if (ev.buttons == 4) {
        ev.preventDefault();
        tool.project.viewBoxX -= ev.movementX / tool.project.viewBoxZoom;
        tool.project.viewBoxY -= ev.movementY / tool.project.viewBoxZoom;
        tool.updateProject();
      } else {
        tool.onEvent({
          type,
          movement: { x: ev.movementX, y: ev.movementY },
          pos: getPos(ev),
          device: tool.project.deviceFromTag(ev.target as SVGUseElement),
          decal: tool.project.decalFromTag(ev.target as SVGUseElement),
          shiftKey: ev.shiftKey,
        });
      }
    };
  } else {
    return (ev: MouseEvent) => {
      tool.onEvent({
        type,
        pos: getPos(ev),
        device: tool.project.deviceFromTag(ev.target as SVGUseElement),
        decal: tool.project.decalFromTag(ev.target as SVGUseElement),
        shiftKey: ev.shiftKey,
      });
      return false;
    };
  }
}

const Decals = memo(function Decals({
  decals,
  highlighted,
}: {
  decals: (Decal | undefined)[];
  highlighted?: Set<number>;
}): ReactNode {
  return decals.map((d, idx) => {
    if (!d) return;
    const data = { "data-decalid": idx };
    switch (d.type) {
      case "text":
        return (
          <text
            key={idx}
            {...d.pos}
            {...data}
            fill={highlighted && highlighted.has(idx) ? "#555" : "#000"}
          >
            {d.text}
          </text>
        );
      case "rect":
        return (
          <rect
            key={idx}
            {...d.pos}
            {...d.size}
            stroke={d.stroke}
            fill={d.fill}
            {...data}
          />
        );
    }
  });
});
