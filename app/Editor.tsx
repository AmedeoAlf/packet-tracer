"use client";
import { useState, useRef, MouseEvent, RefObject } from "react";
import { Project } from "./Project";
import { CanvasEvent, Tool, ToolCtx } from "./tools/Tool";
import { SelectTool } from "./tools/SelectTool";
import { ICONS } from "./devices/Icons";
import { toolFromToolName, TOOLS } from "./tools/TOOLS";
import { DeviceToSVG } from "./devices/deviceTypesDB";

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
  return (
    <>
      <select onChange={ev => {
        setTool(toolFromToolName[ev.target.value].make(toolCtx))
      }
      }>
        {Object.values(TOOLS).map(it => it.toolname).map(it => (<option value={it} key={it}>{it}</option>))}
      </select >
      <div className="flex flex-row">
        <svg
          onClick={toEventHandler(tool, "click")}
          onDoubleClick={toEventHandler(tool, "doubleclick")}
          onMouseUp={toEventHandler(tool, "mouseup")}
          onMouseDown={toEventHandler(tool, "mousedown")}
          onMouseMove={toEventHandler(tool, "mousemove")}
          style={{ width: 500, height: 500 }}
          className="bg-gray-800"
          ref={svg => {
            svgCanvas.current = svg;
            pt = svgCanvas.current?.createSVGPoint();
          }
          }
        >
          <defs>
            {Object.values(ICONS)}
          </defs>
          {Object.values(project.devices).map((d) => DeviceToSVG(d, tool))}
          {tool.svgElements(toolCtx)}
        </svg>
        {tool.panel(toolCtx)}
      </div>
    </>
  );
}

