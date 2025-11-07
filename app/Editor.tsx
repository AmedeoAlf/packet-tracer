"use client";
import { useState, useRef, MouseEvent } from "react";
import { Project } from "./Project";
import { CanvasEvent, Tool, ToolCtx } from "./tools/Tool";
import { SelectTool } from "./tools/SelectTool";
import { ICONS } from "./devices/ICONS";
import { toolFromToolName, TOOLS } from "./tools/TOOLS";
import { DeviceComponent } from "./devices/deviceTypesDB";
import { Coords } from "./common";

export function Editor(p: Project) {
  const [project, setProject] = useState(p);
  const [toolCtx, setToolCtx] = useState<ToolCtx>({
    project, updateProject: () => setProject(new Project(project)), update: () => { }
  });
  toolCtx.update = () => { setToolCtx({ ...toolCtx }) };
  const [tool, setTool] = useState<Tool>(SelectTool.make(toolCtx));

  const svgCanvas = useRef<SVGSVGElement>(null);
  let pt = svgCanvas.current?.createSVGPoint()
  function toEventHandler(tool: Tool, type: CanvasEvent['type']) {
    const getPos = (ev: MouseEvent) => {
      if (!pt) return { x: 0, y: 0 };
      pt.x = ev.clientX;
      pt.y = ev.clientY;

      const { x, y } = pt.matrixTransform(svgCanvas.current!!.getScreenCTM()!!.inverse());
      return { x, y };
    }

    if (type == "mousemove") {
      return (ev: MouseEvent) => tool.onEvent(toolCtx, {
        type,
        movement: { x: ev.movementX, y: ev.movementY },
        pos: getPos(ev),
        device: project.deviceFromTag(ev.target as SVGUseElement),
        shiftKey: ev.shiftKey,
      });
    } else {
      return (ev: MouseEvent) => tool.onEvent(toolCtx, {
        type,
        pos: getPos(ev),
        device: project.deviceFromTag(ev.target as SVGUseElement),
        shiftKey: ev.shiftKey,
      });
    }
  };

  const [canvasSize, setCanvasSize] = useState<[number, number] | undefined>(undefined);
  return (
    <>

      <div className="bg-sky-700 fixed top-0 w-full h-[50px] indent-1.5em border-b-[.1em] border-solid border-sky-800"></div>

      <div id="side-spec-bar" className="fixed top-[50px] right-0 w-[30%] h-(--h-spec-cont) indent-[1.5em] border-sky-800 border-solid border-t-[.1em] border-l-[.1em]">
        <div className="bg-sky-700 h-[20px] indent-0">
          <div id="close-button" className="fixed right-0 cursor-pointer h-[20px] text-[.85em] pr-[5px] pl-[6px] hover:bg-red-500/80">&#128473</div>
        </div>

        {tool.panel(toolCtx)}
      </div>

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

      <div className="fixed bottom-0 left-[35.3%] w-[29.4%] h-[90px] indent-[1,5em] z-0 border-solid border-sky-800 border-t-[.1em]">
        <div className="h-[20%] bg-sky-700"></div>
        <div className="h-[80%] bg-zinc-900">
          <select onChange={ev => {
            setTool(toolFromToolName[ev.target.value].make(toolCtx))
          }
          }>
            {Object.values(TOOLS).map(it => it.toolname).map(it => (<option value={it} key={it}>{it}</option>))}
          </select >
        </div>
      </div>

      <svg
        onClick={toEventHandler(tool, "click")}
        onDoubleClick={toEventHandler(tool, "doubleclick")}
        onMouseUp={toEventHandler(tool, "mouseup")}
        onMouseDown={toEventHandler(tool, "mousedown")}
        onMouseMove={toEventHandler(tool, "mousemove")}
        className={`bg-${svgCanvas.current ? "gray-800" : "stone-800"} -z-1 w-full h-full`}
        viewBox={
          Object.values(project.viewBoxPos)
            .concat(canvasSize?.map(it => it / project.viewBoxZoom) || [10000, 10000])
            .join(" ")
        }
        ref={svg => {
          svgCanvas.current = svg;
          pt = svgCanvas.current?.createSVGPoint();
          if (svgCanvas.current) {
            const sizes = [
              svgCanvas.current.width.baseVal.value,
              svgCanvas.current.height.baseVal.value
            ] satisfies typeof canvasSize;
            if (!canvasSize || sizes[0] != canvasSize[0] && sizes[1] != canvasSize[1])
              setCanvasSize(sizes);
          }
        }}
      >
        <defs>
          {Object.values(ICONS)}
        </defs>
        {Object.values(project.devices).map((d) => DeviceComponent(d, tool))}
        {tool.svgElements(toolCtx)}
      </svg >

    </>
  );
}

