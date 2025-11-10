"use client";
import { useState, useRef, MouseEvent, useEffect, JSX, memo, RefObject } from "react";
import { Project } from "./Project";
import { CanvasEvent, Tool, ToolCtx } from "./tools/Tool";
import { SelectTool, SelectToolCtx } from "./tools/SelectTool";
import { ICONS } from "./devices/ICONS";
import { toolFromToolName, TOOLS } from "./tools/TOOLS";
import { DeviceComponent } from "./devices/deviceTypesDB";

function toEventHandler(
  svgCanvas: RefObject<SVGSVGElement | null>,
  tool: Tool,
  canvasPt: SVGPoint | undefined,
  type: CanvasEvent['type']
): ((ev: MouseEvent) => void) {
  function getPos(ev: MouseEvent) {
    if (!canvasPt) return { x: 0, y: 0 };
    canvasPt.x = ev.clientX;
    canvasPt.y = ev.clientY;

    const { x, y } = canvasPt.matrixTransform(svgCanvas.current!!.getScreenCTM()!!.inverse());
    return { x, y };
  }

  if (type == "mousemove") {
    return (ev: MouseEvent) => tool.onEvent(tool.ctx!!, {
      type,
      movement: { x: ev.movementX, y: ev.movementY },
      pos: getPos(ev),
      device: tool.ctx!!.project.deviceFromTag(ev.target as SVGUseElement),
      shiftKey: ev.shiftKey,
    });
  } else {
    return (ev: MouseEvent) => tool.onEvent(tool.ctx!!, {
      type,
      pos: getPos(ev),
      device: tool.ctx!!.project.deviceFromTag(ev.target as SVGUseElement),
      shiftKey: ev.shiftKey,
    });
  }
};

const SideBar = memo(({ tool, toolCtx }: { tool: Tool, toolCtx: ToolCtx }) => {
  const [open, setOpen] = useState(true);
  return open
    ? (
      <div className="fixed top-[50px] right-0 w-[30%] h-(--h-spec-cont) indent-[1.5em] border-sky-800 border-solid border-t-[.1em] border-l-[.1em]">
        <div className="bg-sky-700 h-[20px] indent-0">
          <div className="fixed right-0 cursor-pointer h-[20px] text-[.85em] pr-[5px] pl-[6px] hover:bg-red-500/80" onClick={() => setOpen(false)}>&#128473</div>
        </div>
        {tool.panel(toolCtx)}
      </div>
    )
    : (
      <button className="fixed top-[50px] right-0 indent-[1.5em] border-sky-800 border-solid border-t-[.1em] border-l-[.1em]" onClick={() => setOpen(true)}>
        Riapri
      </button>
    )
})

function ToolSelector({ tool, setTool }: { tool: Tool, setTool: (t: Tool) => void }) {
  return <div className="fixed bottom-0 left-[35.3%] w-[29.4%] h-[90px] indent-[1,5em] z-0 border-solid border-sky-800 border-t-[.1em]">
    <div className="h-[20%] bg-sky-700"></div>
    <div className="h-[80%] bg-zinc-900">
      <select value={tool.toolname} onChange={ev => setTool(toolFromToolName[ev.target.value].bind(tool.ctx!!))}>
        {Object.values(TOOLS).map(it => it.toolname).map(it => (<option value={it} key={it}>{it}</option>))}
      </select>
    </div>
  </div>
}

const Devices = memo(({ project, highlighted }: { project: Project, highlighted?: Set<number> }) =>
  Object.values(project.devices).map(
    highlighted
      ? (d) =>
        (<DeviceComponent device={d} key={d.id} extraClass={highlighted.has(d.id) ? " brightness-50" : undefined} />)
      : (d) =>
        (<DeviceComponent device={d} key={d.id} />)
  ));

export function Editor(p: Project): JSX.Element {
  const [project, setProject] = useState(p);
  const [toolCtx, setToolCtx] = useState<ToolCtx>({
    project, updateProject: () => setProject(new Project(project)), update: () => { }
  });
  toolCtx.update = () => { setToolCtx({ ...toolCtx }) };
  const [tool, setTool] = useState<Tool>(SelectTool.bind(toolCtx));

  const svgCanvas = useRef<SVGSVGElement>(null);
  let pt = svgCanvas.current?.createSVGPoint();

  const [canvasSize, setCanvasSize] = useState<[number, number] | undefined>(undefined);

  const handler = toEventHandler.bind(null, svgCanvas, tool, pt);

  useEffect(() => {
    window.onresize = () => setCanvasSize(undefined);
  })

  return (
    <>

      <div className="bg-sky-700 fixed top-0 w-full h-[50px] indent-1.5em border-b-[.1em] border-solid border-sky-800"></div>

      <SideBar tool={tool} toolCtx={toolCtx} />

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

      <ToolSelector tool={tool} setTool={setTool} />

      <svg
        onClick={handler("click")}
        onDoubleClick={handler("doubleclick")}
        onMouseUp={handler("mouseup")}
        onMouseDown={handler("mousedown")}
        onMouseMove={handler("mousemove")}
        onMouseEnter={handler("mouseenter")}
        onMouseLeave={handler("mouseleave")}
        className={`bg-${svgCanvas.current ? "gray-700" : "gray-100"} -z-1 w-full h-screen transition-colors`}
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
        <defs>
          {Object.values(ICONS)}
        </defs>
        <Devices project={project} highlighted={tool.toolname == "select" ? (toolCtx as SelectToolCtx).selected : undefined} />
        {tool.svgElements(toolCtx)}
      </svg >

    </>
  );
}

