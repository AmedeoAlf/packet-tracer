"use client";
import { useState, useRef, MouseEvent, RefObject } from "react";
import { DeviceComponent } from "./Device";
import { Project } from "./Project";
import { SelectTool, CanvasEvent } from "./Tool";
import { Tool } from "./Tool";

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
        <g id="router-icon" transform="scale(0.04)">
          <path
            d="M186.97049 390.020858c249.283591-143.926213 654.058848-143.926213 903.342438 0 249.283591 143.921015 249.283591 377.621133 0 521.542148-249.283591 143.926213-654.058848 143.926213-903.342438 0-249.288789-143.921015-249.288789-377.621133 0-521.542148z"
            fill="#4467AE" />
          <path
            d="M0.005198 368.719633h1277.273022v282.072299H0.005198z"
            fill="#4467AE" />
          <path
            d="M186.97049 107.948559c249.283591-143.926213 654.058848-143.926213 903.342438 0 249.283591 143.921015 249.283591 377.621133 0 521.542148-249.283591 143.926213-654.058848 143.926213-903.342438 0-249.288789-143.921015-249.288789-377.621133 0-521.542148z"
            fill="#6D8ACA" />
          <path
            d="M436.243685 524.263279l57.323062 33.095388-164.5621-6.819719-11.814955-95.008246 57.323063 33.095388 148.037797-85.475194 61.73093 35.642386-148.037797 85.469997zM846.320857 216.221989l-57.323063-33.09019 164.562101 6.819719 11.814954 95.008246-57.323062-33.095388-148.037797 85.469996-61.73093-35.637188 148.037797-85.475195zM445.418078 199.744468l57.323062-33.09019-164.5621 6.819718-11.814955 95.008246 57.323063-33.095388 148.042995 85.469997 61.730929-35.637189L445.418078 199.744468zM865.501316 513.560686l-57.323063 33.095388 164.5621-6.819718 11.814955-95.008246-57.323062 33.095388-148.037797-85.469997-61.73093 35.637189 148.037797 85.469996z"
            fill="#FFFFFF" />
        </g>
      </defs>
      {[...project.devices.values()].map((d) => DeviceComponent(d, tool))}
    </svg>
  );
}

