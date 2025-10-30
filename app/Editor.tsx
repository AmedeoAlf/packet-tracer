"use client";
import { useState, useRef, MouseEvent, RefObject } from "react";
import { DeviceToSVG } from "./devices/Device";
import { Project } from "./Project";
import { CanvasEvent, Tool } from "./tools/Tool";
import { SelectTool } from "./tools/SelectTool";
import { ICONS } from "./devices/Icons";

export function Editor(p: Project) {
  const [project, setProject] = useState(p);
  const tool = useRef<Tool>(new SelectTool(project, setProject));

  function toEventHandler(tool: RefObject<Tool>, type: CanvasEvent['type']) {
    return (ev: MouseEvent) => {
      // if (ev.type == "mousedown") console.log("Got event ", ev.type, (ev.target as any))
      if (type == "mousemove") {
        tool.current.onEvent({
          type,
          movement: { x: ev.movementX, y: ev.movementY },
          pos: { x: ev.pageX, y: ev.pageY },
          device: p.deviceFromTag(ev.target as SVGUseElement),
          shiftKey: ev.shiftKey,
        });
      } else {
        tool.current.onEvent({
          type,
          pos: { x: ev.pageX, y: ev.pageY },
          device: p.deviceFromTag(ev.target as SVGUseElement),
          shiftKey: ev.shiftKey,
        });
      }
    };
  };
  return (
    <div>
      <svg
        onClick={toEventHandler(tool, "click")}
        onDoubleClick={toEventHandler(tool, "doubleclick")}
        onMouseUp={toEventHandler(tool, "mouseup")}
        onMouseDown={toEventHandler(tool, "mousedown")}
        onMouseMove={toEventHandler(tool, "mousemove")}
        style={{ width: 500, height: 500 }}
        className="bg-gray-800"
      >
        <defs>
          {Object.values(ICONS)}
        </defs>
        {[...project.devices.values()].map((d) => DeviceToSVG(d, tool))}
      </svg>
      {tool.current.panel()}
    </div>
  );
}

