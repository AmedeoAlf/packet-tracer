/* eslint-disable react-hooks/immutability */

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
import { CanvasEvent, Tool, ToolCtx, TOOLS } from "./tools/Tool";
import { makeSelectTool, SelectTool } from "./tools/SelectTool";
import { ICONS } from "./devices/ICONS";
import { Cables } from "./editorComponents/Cables";
import { SideBar } from "./editorComponents/SideBar";
import { ToolSelector } from "./editorComponents/ToolSelector";
import { Devices } from "./editorComponents/Devices";
import { deviceTypesDB } from "./devices/deviceTypesDB";
import { ProjectManager } from "./ProjectManager";
import { Decal } from "./Project";
import { BtnArray, BtnArrEl } from "./editorComponents/BtnArray";

/*
 * Questo componente è tutta l'interfaccia del sito. Crea gli hook sia per il
 * `ProjectManager` che il `Tool` in uso, pertanto viene rirenderizzato ad ogni
 * cambiamento di questi.
 */
export function Editor({
  initialProject,
  isSaved,
  save,
}: {
  initialProject: ProjectManager;
  isSaved: boolean;
  save: (p: ProjectManager) => void;
}): ReactNode {
  const [shouldSave, setShouldSave] = useState(false);
  const [project, setProject] = useState(initialProject);
  const [tool, setTool] = useState<Tool<any>>(makeSelectTool());
  const toolRef = useRef(tool);
  toolRef.current = tool;

  const toolCtx: ToolCtx<Tool<object>> = {
    tool,
    project,
    toolRef,
    updateProject() {
      const newProj = new ProjectManager(project);
      setShouldSave(true);
      setProject(newProj);
    },
    updateTool() {
      setTool({ ...tool });
    },
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (shouldSave) save(project);
      setShouldSave(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [project, save, shouldSave]);

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

  const mouseHandler = buildMouseEventHandler.bind(
    null,
    svgToDOMPoint,
    toolCtx,
  );

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
    const vb = [project.viewBoxX, project.viewBoxY, 10000, 10000];
    if (canvasSize) {
      vb[2] = canvasSize[0] / project.viewBoxZoom;
      vb[3] = canvasSize[1] / project.viewBoxZoom;
      vb[0] -= vb[2] * 0.5;
      vb[1] -= vb[3] * 0.5;
    }
    return vb;
  }, [canvasSize, project.viewBoxZoom, project.viewBoxX, project.viewBoxY]);

  // useEffect(() => {
  //   const int = setInterval(() => {
  //     if (proj.areTicksPending()) { proj.advanceTick() };
  //   }, 10)
  //   return clearInterval.bind(0, int);
  // }, [])
  project.advanceTickToCallback(toolCtx);

  return (
    <div
      onKeyDown={buildKeyboardEventHandler(toolCtx, "keydown")}
      onKeyUp={buildKeyboardEventHandler(toolCtx, "keyup")}
      tabIndex={0}
    >
      <div className="bg-sky-700 fixed top-0 w-full h-[50px] indent-1.5em border-b-[.1em] border-solid border-sky-800 flex items-center px-1">
        <BtnArray>
          <BtnArrEl onClick={() => project.advanceTickToCallback(tool)}>
            Advance
          </BtnArrEl>
          <BtnArrEl
            onClick={() =>
              navigator.clipboard.writeText(
                JSON.stringify(project.exportProject()),
              )
            }
          >
            Salva
          </BtnArrEl>
          <BtnArrEl
            onClick={async () =>
              setProject(
                ProjectManager.fromSerialized(
                  JSON.parse(await navigator.clipboard.readText()),
                ),
              )
            }
          >
            Carica
          </BtnArrEl>
        </BtnArray>
        <p className="inline ml-3">
          {!shouldSave && isSaved ? "Salvato" : "Salvataggio in corso"}
        </p>
        <p className="inline ml-3">Tick corrente: {project.currTick}</p>
      </div>

      <SideBar toolCtx={toolCtx} />

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
                  project.createDevice(it.proto.deviceType, {
                    x: (project.lastId % 5) * 100 - 600,
                    y: Math.floor(project.lastId / 5) * 100 - 350,
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
        toolname={tool.toolname}
        setToolTo={(t) => setTool(TOOLS[t](toolRef.current))}
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
            const from = toolCtx.project.viewBoxZoom;
            toolCtx.project.viewBoxZoom *= 1 + ev.deltaY * -0.0005;
            // devono entrambe non essere undefined per chiamare svgToDOMPoint
            if (canvasSize && pt) {
              const factor = from / toolCtx.project.viewBoxZoom;

              const cursor = svgToDOMPoint(ev.clientX, ev.clientY)!;
              const center = svgToDOMPoint(
                canvasSize[0] / 2,
                canvasSize[1] / 2,
              )!;

              toolCtx.project.viewBoxX += (cursor.x - center.x) * (1 - factor);
              toolCtx.project.viewBoxY += (cursor.y - center.y) * (1 - factor);
            }
            toolCtx.updateProject();
            toolCtx.updateTool();
          } else if (ev.shiftKey) {
            toolCtx.project.viewBoxX += ev.deltaY / toolCtx.project.viewBoxZoom;
            toolCtx.updateProject();
            // toolCtx.update()
          } else {
            toolCtx.project.viewBoxX += ev.deltaX / toolCtx.project.viewBoxZoom;
            toolCtx.project.viewBoxY += ev.deltaY / toolCtx.project.viewBoxZoom;
            toolCtx.updateProject();
            // toolCtx.update()
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
          decals={toolCtx.project.immutableDecals}
          highlighted={
            tool.toolname == "select"
              ? (tool as SelectTool).selectedDecals
              : undefined
          }
        />
        <Cables
          devices={project.immutableDevices}
          cables={project.getCables()}
        />
        {toolCtx.tool.svgElements(toolCtx)}
        <Devices
          devices={project.immutableDevices}
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
  ctx: ToolCtx<Tool<object>>,
  type: Extract<CanvasEvent["type"], "keydown" | "keyup">,
) {
  return (ev: KeyboardEvent<HTMLDivElement>) => {
    if (
      (ev.target as HTMLElement).tagName == "INPUT" ||
      (ev.target as HTMLElement).tagName == "TEXTAREA"
    )
      return;
    const evObj = {
      type,
      key: ev.key,
      ctrl: ev.ctrlKey,
      shift: ev.shiftKey,
      consumed: false,
    };
    ctx.tool.onEvent(ctx, evObj);
    if (evObj.consumed) ev.preventDefault();
  };
}

// Ritorna una funzione che chiama `tool.onEvent(event)` con un oggetto
// `CanvasEvent`, costruito a partire dal tipo di evento DOM specificato
function buildMouseEventHandler(
  toDOMPoint: (x: number, y: number) => DOMPoint | undefined,
  ctx: ToolCtx<Tool<object>>,
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
        ctx.project.viewBoxX -= ev.movementX / ctx.project.viewBoxZoom;
        ctx.project.viewBoxY -= ev.movementY / ctx.project.viewBoxZoom;
        ctx.updateProject();
      } else {
        ctx.tool.onEvent(ctx, {
          type,
          movement: { x: ev.movementX, y: ev.movementY },
          pos: getPos(ev),
          device: ctx.project.deviceFromTag(ev.target as SVGUseElement),
          decal: ctx.project.decalFromTag(ev.target as SVGUseElement),
          shiftKey: ev.shiftKey,
        });
      }
    };
  } else {
    return (ev: MouseEvent) => {
      ctx.tool.onEvent(ctx, {
        type,
        pos: getPos(ev),
        device: ctx.project.deviceFromTag(ev.target as SVGUseElement),
        decal: ctx.project.decalFromTag(ev.target as SVGUseElement),
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
