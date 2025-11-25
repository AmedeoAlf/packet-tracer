"use client";
import { useState, useRef, MouseEvent, useEffect, ReactNode, useMemo } from "react";
import { MAX_ZOOM_FACTOR, MIN_ZOOM_FACTOR, Project } from "./Project";
import { CanvasEvent, Tool } from "./tools/Tool";
import { makeSelectTool, SelectTool } from "./tools/SelectTool";
import { ICONS } from "./devices/ICONS";
import { Cables } from "./editorComponents/Cables";
import { SideBar } from "./editorComponents/SideBar";
import { ToolSelector } from "./editorComponents/ToolSelector";
import { Devices } from "./editorComponents/Devices";
import { clamp } from "./common";

/*
 * Questo componente è tutta l'interfaccia del sito. Crea gli hook sia per il
 * `Project` che il `Tool` in uso, pertanto viene rirenderizzato ad ogni
 * cambiamento di questi.
 */
export function Editor(p: Project): ReactNode {
  const [project, setProject] = useState(p);
  const [tool, setTool] = useState<Tool>(makeSelectTool({ project, updateProject: () => setProject(new Project(project)), update: () => { } }));
  tool.update = () => {
    setTool({ ...tool })
  };

  const svgCanvas = useRef<SVGSVGElement>(null);
  let pt = svgCanvas.current?.createSVGPoint();

  const [canvasSize, setCanvasSize] = useState<[number, number] | undefined>(undefined);

  function svgToDOMPoint(x: number, y: number): DOMPoint | undefined {
    if (!pt) return;
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(svgCanvas.current!!.getScreenCTM()!!.inverse());
  }

  const handler = buildEventHandler.bind(null, svgToDOMPoint, tool);

  useEffect(() => {
    window.onresize = () => setCanvasSize(undefined);
    window.addEventListener("wheel", e => {
      if (e.ctrlKey) e.preventDefault();
    }, { passive: false });
  }, [])

  const svgViewBox = useMemo(() => {
    const vb = [project.viewBoxPos.x, project.viewBoxPos.y, 10000, 10000]
    if (canvasSize) {
      vb[2] = canvasSize[0] / project.viewBoxZoom;
      vb[3] = canvasSize[1] / project.viewBoxZoom;
      vb[0] -= vb[2] * 0.5;
      vb[1] -= vb[3] * 0.5;
    }
    return vb;
  }, [canvasSize, project.viewBoxZoom, project.viewBoxPos.x, project.viewBoxPos.y]);

  return (
    <>

      <div className="bg-sky-700 fixed top-0 w-full h-[50px] indent-1.5em border-b-[.1em] border-solid border-sky-800"></div>

      <SideBar tool={tool} />

      <div id="left-side-bar" className="fixed bottom-0 left-0 w-[35.3%] h-[150px] indent-[1,5em] border-solid border-t-[.1em] border-r-[.1em] border-sky-800">
        <div className="h-[20%] bg-sky-700"></div>
        <div className="h-[80%] bg-zinc-900 flex flex-wrap justify-center">

          <button
            className="h-16 w-16 m-[2.5%] border-solid border-[.1em] border-white">
              <svg viewBox="-25 -25 53 53">
                  {ICONS["#router-icon"]}
              </svg>
          </button>

          <button
            className="h-16 w-16 m-[2.5%] border-solid border-[.1em] border-white">
              <svg viewBox="-25 -25 53 53">
                  {ICONS["#switch-icon"]}
              </svg>
          </button>

          <button
            className="h-16 w-16 m-[2.5%] border-solid border-[.1em] border-white">
              <svg viewBox="-27 -20 48 48">
                  {ICONS["#server-icon"]}
              </svg>
          </button>

          <button
            className="h-16 w-16 m-[2.5%] border-solid border-[.1em] border-white">
              <svg viewBox="-30 -22 53 53">
                  {ICONS["#database-icon"]}
              </svg>
          </button>

          <button
            className="h-16 w-16 m-[2.5%] border-solid border-[.1em] border-white">
              <svg viewBox="-29 -22.5 53 53">
                  {ICONS["#pc-icon"]}
              </svg>
          </button>

        </div>
      </div>

      <div id="right-side-bar" className="fixed bottom-0 right-0 w-[35.3%] h-[150px] indent-[1,5em] border-solid border-t-[.1em] border-l-[.1em] border-sky-800">
        <div className="h-[20%] bg-sky-700"></div>
        <div className="h-[80%] bg-zinc-900 flex flex-wrap justify-center">

          <button
            className="h-16 w-16 border-solid border-[.1em] border-white m-[2.5%] ">
          </button>

          <button
            className="h-16 w-16 border-solid border-[.1em] border-white m-[2.5%] ">
          </button>

          <button
            className="h-16 w-16 border-solid border-[.1em] border-white m-[2.5%] ">
          </button>

          <button
            className="h-16 w-16 border-solid border-[.1em] border-white m-[2.5%] ">
          </button>

          <button
            className="h-16 w-16 border-solid border-[.1em] border-white m-[2.5%] ">
          </button>

        </div>
      </div>

      {useMemo(
        () => ToolSelector({ tool, setTool }),
        [tool.toolname]
      )}

      <svg
        onClick={handler("click")}
        onDoubleClick={handler("doubleclick")}
        onMouseUp={handler("mouseup")}
        onMouseDown={handler("mousedown")}
        onMouseMove={handler("mousemove")}
        onMouseEnter={handler("mouseenter")}
        onMouseLeave={handler("mouseleave")}
        onWheel={ev => {
          if (ev.ctrlKey) {
            const from = tool.project.viewBoxZoom;
            tool.project.viewBoxZoom *= 1 + ev.deltaY * -0.0005
            tool.project.viewBoxZoom = clamp(tool.project.viewBoxZoom, MIN_ZOOM_FACTOR, MAX_ZOOM_FACTOR);
            // devono entrambe non essere undefined per chiamare svgToDOMPoint
            if (canvasSize && pt) {
              const factor = from / tool.project.viewBoxZoom;

              const cursor = svgToDOMPoint(ev.clientX, ev.clientY)!!;
              const center = svgToDOMPoint(canvasSize[0] / 2, canvasSize[1] / 2)!!;

              tool.project.viewBoxPos.x += (cursor.x - center.x) * (1 - factor);
              tool.project.viewBoxPos.y += (cursor.y - center.y) * (1 - factor);
            }
            tool.updateProject()
            tool.update()
          } else if (ev.shiftKey) {
            tool.project.viewBoxPos.x += ev.deltaY / tool.project.viewBoxZoom;
            tool.updateProject()
            // tool.update()
          } else {
            tool.project.viewBoxPos.x += ev.deltaX / tool.project.viewBoxZoom;
            tool.project.viewBoxPos.y += ev.deltaY / tool.project.viewBoxZoom;
            tool.updateProject()
            // tool.update()
          }
        }
        }
        className={`bg-${svgCanvas.current ? "gray-700" : "gray-100"} -z-1 w-full h-screen transition-colors select-none`}
        viewBox={svgViewBox.join(" ")}
        ref={svg => {
          svgCanvas.current = svg;
          pt = svgCanvas.current?.createSVGPoint();
          if (svgCanvas.current) {
            const rect = svgCanvas.current.getBoundingClientRect();
            if (!canvasSize || rect.width != canvasSize[0] || rect.height != canvasSize[1])
              setCanvasSize([rect.width, rect.height]);
          }
        }}
      >
        <defs> {Object.values(ICONS)} </defs>
        <Cables project={project} cables={project.getCables()} />
        <Devices project={project} highlighted={tool.toolname == "select" ? (tool as SelectTool).selected : undefined} />
        {tool.svgElements()}
      </svg >

    </>
  );
}

// Ritorna una funzione che chiama `tool.onEvent(event)` con un oggetto
// `CanvasEvent`, costruito a partire dal tipo di evento DOM specificato
function buildEventHandler(
  toDOMPoint: (x: number, y: number) => DOMPoint | undefined,
  tool: Tool,
  type: CanvasEvent['type']
): ((ev: MouseEvent) => void) {
  const getPos = (ev: MouseEvent) => {
    const result = toDOMPoint(ev.clientX, ev.clientY);
    return result ? { x: result.x, y: result.y } : { x: 0, y: 0 };
  }

  if (type == "mousemove") {
    return (ev: MouseEvent) => {
      if (ev.buttons == 4) {
        ev.preventDefault()
        tool.project.viewBoxPos.x -= ev.movementX / tool.project.viewBoxZoom;
        tool.project.viewBoxPos.y -= ev.movementY / tool.project.viewBoxZoom;
        tool.updateProject();
      } else {
        tool.onEvent({
          type,
          movement: { x: ev.movementX, y: ev.movementY },
          pos: getPos(ev),
          device: tool.project.deviceFromTag(ev.target as SVGUseElement),
          shiftKey: ev.shiftKey,
        })
      }
    };
  } else {
    return (ev: MouseEvent) => {
      tool.onEvent({
        type,
        pos: getPos(ev),
        device: tool.project.deviceFromTag(ev.target as SVGUseElement),
        shiftKey: ev.shiftKey,
      })
      return false;
    };
  }
};

