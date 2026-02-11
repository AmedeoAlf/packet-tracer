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
import {
  isDecalHighlighted,
  isDeviceHighlighted,
  isSelectTool,
  makeSelectTool,
} from "./tools/SelectTool";
import { ICONS } from "./devices/ICONS";
import { Cables } from "./editorComponents/Cables";
import { SideBar } from "./editorComponents/SideBar";
import { ToolSelector } from "./editorComponents/ToolSelector";
import { Devices } from "./editorComponents/Devices";
import { ProjectManager } from "./ProjectManager";
import { Decal } from "./Project";
import { TopBarBtns, TopBarBtnsParams } from "./editorComponents/TopBarBtns";
import { Coords } from "./common";

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
  const [lastTool, setLastTool] = useState<keyof typeof TOOLS>("select");
  const toolRef = useRef(tool);
  const projectRef = useRef(project);

  const toolCtx: ToolCtx<Tool<object>> = {
    tool,
    project,
    toolRef,
    projectRef,
    updateProject() {
      projectRef.current = new ProjectManager(projectRef.current);
      setShouldSave(true);
      setProject(projectRef.current);
    },
    updateTool() {
      setTool({ ...toolCtx.toolRef.current });
    },
    revertTool() {
      if (lastTool != toolCtx.tool.toolname)
        setTool(TOOLS[lastTool](toolRef.current));
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

  const tbbp: TopBarBtnsParams = useRef({ ctx: toolCtx, setProject });
  tbbp.current = { ctx: toolCtx, setProject };

  const currProject = projectRef.current;
  return (
    <div
      onKeyDown={buildKeyboardEventHandler(toolCtx, "keydown")}
      onKeyUp={buildKeyboardEventHandler(toolCtx, "keyup")}
      tabIndex={0}
    >
      <div className="bg-sky-700 fixed top-0 w-full h-[50px] indent-1.5em border-b-[.1em] border-solid border-sky-800 flex items-center px-1">
        <TopBarBtns ref={tbbp} />

        <p className="inline ml-3">
          {!shouldSave && isSaved ? "Salvato" : "Salvataggio in corso"}
        </p>
        <p className="inline ml-3">Tick corrente: {project.currTick}</p>
      </div>

      <SideBar toolCtx={toolCtx} />

      <ToolSelector
        toolname={tool.toolname}
        setToolTo={(t) => {
          toolRef.current = TOOLS[t](toolRef.current);
          toolCtx.updateTool();
        }}
        anchor={lastTool}
        setAnchor={setLastTool}
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
            const from = currProject.viewBoxZoom;
            currProject.viewBoxZoom *= 1 + ev.deltaY * -0.0005;
            // devono entrambe non essere undefined per chiamare svgToDOMPoint
            if (canvasSize && pt) {
              const factor = from / currProject.viewBoxZoom;

              const cursor = svgToDOMPoint(ev.clientX, ev.clientY)!;
              const center = svgToDOMPoint(
                canvasSize[0] / 2,
                canvasSize[1] / 2,
              )!;

              currProject.viewBoxX += (cursor.x - center.x) * (1 - factor);
              currProject.viewBoxY += (cursor.y - center.y) * (1 - factor);
            }
            toolCtx.updateProject();
            toolCtx.updateTool();
          } else if (ev.shiftKey) {
            currProject.viewBoxX += ev.deltaY / toolCtx.project.viewBoxZoom;
            toolCtx.updateProject();
            // toolCtx.update()
          } else {
            currProject.viewBoxX += ev.deltaX / toolCtx.project.viewBoxZoom;
            currProject.viewBoxY += ev.deltaY / toolCtx.project.viewBoxZoom;
            toolCtx.updateProject();
            // toolCtx.update()
          }
        }}
        className={`bg-${svgCanvas.current ? "gray-700" : "gray-100"} -z-1 w-full h-screen transition-colors select-none`}
        viewBox={svgViewBox.join(" ")}
        ref={(svg) => {
          svgCanvas.current = svg;
          // eslint-disable-next-line react-hooks/immutability
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
            isSelectTool(tool) ? isDecalHighlighted.bind(null, tool) : undefined
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
            isSelectTool(toolCtx.tool)
              ? isDeviceHighlighted.bind(null, tool)
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
    return (result ? [result.x, result.y] : [0, 0]) as Coords;
  };

  if (type == "mousemove") {
    return (ev: MouseEvent) => {
      if (ev.buttons == 4) {
        ev.preventDefault();
        ctx.projectRef.current.viewBoxX -=
          ev.movementX / ctx.projectRef.current.viewBoxZoom;
        ctx.projectRef.current.viewBoxY -=
          ev.movementY / ctx.projectRef.current.viewBoxZoom;
        ctx.updateProject();
      } else {
        ctx.tool.onEvent(ctx, {
          type,
          movement: [ev.movementX, ev.movementY],
          pos: getPos(ev),
          device: ctx.projectRef.current.deviceFromTag(
            ev.target as SVGUseElement,
          ),
          decal: ctx.projectRef.current.decalFromTag(
            ev.target as SVGUseElement,
          ),
          shiftKey: ev.shiftKey,
        });
      }
    };
  } else {
    return (ev: MouseEvent) => {
      ctx.tool.onEvent(ctx, {
        type,
        pos: getPos(ev),
        device: ctx.projectRef.current.deviceFromTag(
          ev.target as SVGUseElement,
        ),
        decal: ctx.projectRef.current.decalFromTag(ev.target as SVGUseElement),
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
  highlighted?: (d: Decal) => boolean;
}): ReactNode {
  return decals.map((d, idx) => {
    if (!d) return;
    const data = { "data-decalid": idx };
    switch (d.type) {
      case "text":
        return (
          <text
            key={idx}
            x={d.pos[0]}
            y={d.pos[1]}
            {...data}
            fill={highlighted && highlighted(d) ? "#555" : "#000"}
          >
            {d.text}
          </text>
        );
      case "rect":
        return (
          <rect
            key={idx}
            x={d.pos[0]}
            y={d.pos[1]}
            {...d.size}
            stroke={d.stroke}
            fill={d.fill}
            {...data}
          />
        );
    }
  });
});
