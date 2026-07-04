import { memo, ReactNode, useEffect, useState } from "react";
import { TOOL_LIST, TOOLS } from "../tools/Tool";
import { WrapToolIcon } from "../tools/TOOL_ICONS";
import { SelectableCard } from "./reusable/SelectableCard";

// Il selettore del tool in uso
export const ToolSelector = memo(
  function ToolSelector({
    tooltip,
    toolname,
    setTool,
    anchor,
  }: {
    tooltip: ReactNode;
    toolname: keyof typeof TOOLS;
    setTool: (t: keyof typeof TOOLS, withAnchor?: boolean) => void;
    anchor: keyof typeof TOOLS;
  }): ReactNode {
    const [hoverTooltip, setHoverTooltip] = useState<string | undefined>(
      undefined,
    );

    useEffect(() => {
      const cb = (ev: KeyboardEvent) => {
        if (ev.key == "Escape") {
          setTool("select", true);
        }
      };
      window.addEventListener("keyup", cb);
      return () => window.removeEventListener("keyup", cb);
    }, [setTool]);

    return (
      <div className="fixed bottom-1 w-full flex justify-center items-center pointer-events-none flex-col gap-2">
        <div className="text-sm">{hoverTooltip ?? tooltip}</div>
        <div className="bg-topbar w-max h-min flex flex-wrap justify-center gap-1 p-2 rounded-2xl pointer-events-auto">
          {TOOL_LIST.map((it) => (
            <SelectableCard
              key={it}
              onClick={(ev) => setTool(it, !ev.shiftKey)}
              isSelected={it == toolname}
              unselectedStyle="bg-topbar"
              onMouseEnter={() => setHoverTooltip(it)}
              onMouseLeave={() => setHoverTooltip(undefined)}
              className={
                "h-min p-2 rounded-xl" +
                (it == toolname
                  ? ""
                  : it == anchor
                    ? " border-selected-border"
                    : " border-transparent")
              }
            >
              <WrapToolIcon icon={it} />
            </SelectableCard>
          ))}
        </div>
      </div>
    );
  },
  (o, n) => o.toolname === n.toolname && o.tooltip === n.tooltip,
);
