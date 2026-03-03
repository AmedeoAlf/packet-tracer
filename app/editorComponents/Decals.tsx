import { memo, ReactNode } from "react";
import { Decal } from "../Project";
import { Tool } from "../tools/Tool";
import {
  isDecalHighlighted,
  isSelectTool,
  SelectTool,
} from "../tools/SelectTool";

export const Decals = memo(
  function Decals({
    decals,
    tool,
  }: {
    decals: (Decal | null)[];
    tool: Tool<object> | SelectTool;
  }): ReactNode {
    const highlighted = isSelectTool(tool)
      ? isDecalHighlighted.bind(null, tool)
      : undefined;
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
              fill={d.fg}
              className={highlighted && highlighted(d) ? "opacity-50" : ""}
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
              stroke={d.stroke ?? "none"}
              fill={d.fill ?? "none"}
              {...data}
            />
          );
      }
    });
  },
  (p, n) =>
    p.decals == n.decals &&
    (p.tool == n.tool || (!isSelectTool(p.tool) && !isSelectTool(n.tool))),
);
