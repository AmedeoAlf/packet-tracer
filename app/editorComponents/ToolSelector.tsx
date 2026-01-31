import { memo, ReactNode } from "react";
import { TOOL_LIST, TOOLS } from "../tools/Tool";
import { WrapToolIcon } from "../tools/TOOL_ICONS";
import { SelectableCard } from "./SelectableCard";

// Il selettore del tool in uso
export const ToolSelector = memo(
  function ToolSelector({
    toolname,
    setToolTo,
  }: {
    toolname: keyof typeof TOOLS;
    setToolTo: (t: keyof typeof TOOLS) => void;
  }): ReactNode {
    return (
      <div className="fixed bottom-1 left-[35.3%] bg-slate-800 rounded-md w-max h-min flex flex-wrap justify-center gap-1 p-1">
        {TOOL_LIST.map((it) => (
          <SelectableCard
            key={it}
            onClick={() => setToolTo(it)}
            isSelected={it == toolname}
            className="h-min"
          >
            <WrapToolIcon icon={it} />
          </SelectableCard>
        ))}
      </div>
    );
  },
  (o, n) => o.toolname === n.toolname,
);
