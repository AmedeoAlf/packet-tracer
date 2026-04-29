import { memo, ReactNode } from "react";
import { Decal } from "../Project";
import { AnyTool } from "../tools/Tool";
import { isDecalHighlighted, isSelectTool } from "../tools/SelectTool";
import { cssColor } from "../common";

export const Decals = memo(
  function Decals({
    decals,
    tool,
  }: {
    decals: (Decal | null)[];
    tool: AnyTool;
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
              fill={cssColor(d.fg)}
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
              stroke={cssColor(d.stroke) ?? "none"}
              strokeWidth={2}
              fill={cssColor(d.fill) ?? "none"}
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
