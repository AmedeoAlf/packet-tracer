import {
  useState,
  useRef,
  MouseEvent,
  useEffect,
  ReactNode,
  useMemo,
  KeyboardEvent,
  WheelEventHandler,
} from "react";
import { AnyTool, CanvasEvent, ToolCtx, TOOLS } from "./tools/Tool";
import { makeSelectTool } from "./tools/SelectTool";
import { ICONS } from "./devices/ICONS";
import { Cables } from "./editorComponents/Cables";
import { SideBar } from "./editorComponents/SideBar";
import { ToolSelector } from "./editorComponents/ToolSelector";
import { Devices } from "./editorComponents/Devices";
import { ProjectManager } from "./ProjectManager";
import { TopBarBtns } from "./editorComponents/TopBarBtns";
import { Coords } from "./common";
import { Decals } from "./editorComponents/Decals";

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
  const [tool, setTool] = useState<AnyTool>(() => makeSelectTool({}, project));
  const [lastTool, setLastTool] = useState<keyof typeof TOOLS>("select");
  const toolRef = useRef(tool);
  const projectRef = useRef(project);
  const [canvasSize, setCanvasSize] = useState<[number, number] | undefined>(
    undefined,
  );
  const svgCanvas = useRef<SVGSVGElement>(null);
  let svgPt = svgCanvas.current?.createSVGPoint();

  const toolCtx: ToolCtx<AnyTool> = {
    tool,
    project,
    toolRef,
    projectRef,
    updateProject() {
      // projectRef.current = new ProjectManager(projectRef.current);
      // projectRef.current.applyMutations();
      setShouldSave(true);
      setProject(new ProjectManager(projectRef.current));
    },
    updateTool() {
      setTool({ ...toolCtx.toolRef.current });
    },
    revertTool() {
      if (lastTool == toolCtx.tool.toolname) return;
      toolRef.current = TOOLS[lastTool](toolRef.current, projectRef.current);
      this.updateTool();
    },
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (shouldSave) save(project);
      setShouldSave(false);
    }, 500);
    window.onbeforeunload = shouldSave ? () => save(project) : null;
    return () => clearTimeout(timeout);
  }, [project, save, shouldSave]);

  const svgToDOMPoint = svgPt
    ? (x: number, y: number): DOMPoint => {
        svgPt!.x = x;
        svgPt!.y = y;
        return svgPt!.matrixTransform(
          svgCanvas.current!.getScreenCTM()!.inverse(),
        );
      }
    : undefined;

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
  useEffect(() => {
    projectRef.current.advanceTickToCallback(toolCtx);
  });

  return (
    <div
      onKeyDown={buildKeyboardEventHandler(toolCtx, "keydown")}
      onKeyUp={buildKeyboardEventHandler(toolCtx, "keyup")}
      tabIndex={0}
    >
      <div className="bg-topbar fixed top-0 w-full h-12 indent-1.5em flex items-center px-1 border-b-2 border-topbar-border">
        <TopBarBtns ctx={toolCtx} />

        <p className="inline ml-3">
          {!shouldSave && isSaved ? "Salvato" : "Salvataggio in corso"}
        </p>
        <p className="inline ml-3">Tick corrente: {project.currTick}</p>
      </div>

      <SideBar toolCtx={toolCtx} />

      <ToolSelector
        toolname={tool.toolname}
        setToolTo={(t) => {
          toolRef.current = TOOLS[t](toolRef.current, projectRef.current);
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
        onWheel={canvasWheelEventHandler(toolCtx, svgToDOMPoint, canvasSize)}
        className={`bg-${svgCanvas.current ? "bg-background" : "gray-100"} -z-1 w-full h-screen transition-colors select-none`}
        viewBox={svgViewBox.join(" ")}
        ref={(svg) => {
          svgCanvas.current = svg;

          if (canvasSize) return;
          svgPt = svgCanvas.current?.createSVGPoint();
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
        <Decals decals={toolCtx.project.immutableDecals} tool={tool} />
        <Cables
          devices={project.immutableDevices}
          cables={project.getCables()}
        />
        {toolCtx.tool.svgElements(toolCtx)}
        <Devices devices={project.immutableDevices} tool={toolCtx.tool} />
      </svg>
    </div>
  );
}

// buildEventHandler per eventi "keydown" e "keyup"
function buildKeyboardEventHandler(
  ctx: ToolCtx<AnyTool>,
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
  toDOMPoint: ((x: number, y: number) => DOMPoint) | undefined,
  ctx: ToolCtx<AnyTool>,
  type: Exclude<CanvasEvent["type"], "keydown" | "keyup">,
): (ev: MouseEvent) => void {
  const getPos = (ev: MouseEvent): Coords => {
    if (!toDOMPoint) return [0, 0];
    const result = toDOMPoint(ev.clientX, ev.clientY);
    return [result.x, result.y];
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

function canvasWheelEventHandler(
  ctx: ToolCtx<AnyTool>,
  toDOMPoint: ((x: number, y: number) => DOMPoint) | undefined,
  canvasSize: Coords | undefined,
): WheelEventHandler {
  return (ev) => {
    const currProject = ctx.projectRef.current;
    if (ev.ctrlKey) {
      const from = currProject.viewBoxZoom;

      const MAX_ZOOM_INCREMENT = 0.2;
      let requestedIncrement = ev.deltaY * -0.01;
      if (Math.abs(requestedIncrement) > MAX_ZOOM_INCREMENT)
        requestedIncrement = Math.sign(requestedIncrement) * MAX_ZOOM_INCREMENT;

      currProject.viewBoxZoom *= 1 + requestedIncrement;
      // devono entrambe non essere undefined per chiamare svgToDOMPoint
      if (canvasSize && toDOMPoint) {
        const factor = from / currProject.viewBoxZoom;

        const cursor = toDOMPoint(ev.clientX, ev.clientY)!;
        const center = toDOMPoint(canvasSize[0] / 2, canvasSize[1] / 2)!;

        currProject.viewBoxX += (cursor.x - center.x) * (1 - factor);
        currProject.viewBoxY += (cursor.y - center.y) * (1 - factor);
      }
      ctx.updateProject();
      ctx.updateTool();
    } else if (ev.shiftKey) {
      currProject.viewBoxX += ev.deltaY / ctx.project.viewBoxZoom;
      ctx.updateProject();
      // ctx.update()
    } else {
      currProject.viewBoxX += ev.deltaX / ctx.project.viewBoxZoom;
      currProject.viewBoxY += ev.deltaY / ctx.project.viewBoxZoom;
      ctx.updateProject();
      // ctx.update()
    }
  };
}
