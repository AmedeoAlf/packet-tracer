"use client";
import { useState, useRef, MouseEvent, useEffect, memo, RefObject, ReactNode, useMemo } from "react";
import { Project } from "./Project";
import { CanvasEvent, Tool } from "./tools/Tool";
import { makeSelectTool, SelectTool } from "./tools/SelectTool";
import { ICONS } from "./devices/ICONS";
import { deviceTypesDB } from "./devices/deviceTypesDB";
import { Device } from "./devices/Device";
import { Cables } from "./editorComponents/Cables";
import { SideBar } from "./editorComponents/SideBar";
import { ToolSelector } from "./editorComponents/ToolSelector";
import { Devices } from "./editorComponents/Devices";

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

  const handler = buildEventHandler.bind(null, svgCanvas, tool, pt);

  useEffect(() => {
    window.onresize = () => setCanvasSize(undefined);
  })

  return (
    <>

      <div className="bg-sky-700 fixed top-0 w-full h-[50px] indent-1.5em border-b-[.1em] border-solid border-sky-800"></div>

      <SideBar tool={tool} />

      <div id="left-side-bar" className="fixed bottom-0 left-0 w-[35.3%] h-[150px] indent-[1,5em] border-solid border-t-[.1em] border-r-[.1em] border-sky-800">
        <div className="h-[20%] bg-sky-700"></div>
        <div className="h-[80%] bg-zinc-900">
          <div className="w-full h-screen"></div>
        </div>
      </div>

      <div id="right-side-bar" className="fixed bottom-0 right-0 w-[35.3%] h-[150px] indent-[1,5em] border-solid border-t-[.1em] border-l-[.1em] border-sky-800">
        <div className="h-[20%] bg-sky-700"></div>
        <div className="h-[80%] bg-zinc-900"></div>
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
        className={`bg-${svgCanvas.current ? "gray-700" : "gray-100"} -z-1 w-full h-screen transition-colors select-none`}
        viewBox={
          Object.values(project.viewBoxPos)
            .concat(canvasSize?.map(it => it / project.viewBoxZoom) || [10000, 10000])
            .join(" ")
        }
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
        {useMemo(
          () => <Cables project={project} cables={project.getCables()} />,
          [project.getCables()]
        )}
        <Devices project={project} highlighted={tool.toolname == "select" ? (tool as SelectTool).selected : undefined} />
        {tool.svgElements()}
      </svg >

    </>
  );
}

// Ritorna una funzione che chiama `tool.onEvent(event)` con un oggetto
// `CanvasEvent`, costruito a partire dal tipo di evento DOM specificato
function buildEventHandler(
  svgCanvas: RefObject<SVGSVGElement | null>,
  tool: Tool,
  canvasPt: SVGPoint | undefined,
  type: CanvasEvent['type']
): ((ev: MouseEvent) => void) {
  const getPos = canvasPt
    ? (ev: MouseEvent) => {
      canvasPt.x = ev.clientX;
      canvasPt.y = ev.clientY;

      const { x, y } = canvasPt.matrixTransform(svgCanvas.current!!.getScreenCTM()!!.inverse());
      return { x, y };
    }
    : () => { return { x: 0, y: 0 } };

  if (type == "mousemove") {
    return (ev: MouseEvent) => tool.onEvent({
      type,
      movement: { x: ev.movementX, y: ev.movementY },
      pos: getPos(ev),
      device: tool.project.deviceFromTag(ev.target as SVGUseElement),
      shiftKey: ev.shiftKey,
    });
  } else {
    return (ev: MouseEvent) => tool.onEvent({
      type,
      pos: getPos(ev),
      device: tool.project.deviceFromTag(ev.target as SVGUseElement),
      shiftKey: ev.shiftKey,
    });
  }
};

