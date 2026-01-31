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
      <div className="fixed bottom-0 left-[35.3%] w-[29.4%] h-min indent-[1,5em] z-0 border-solid border-sky-800 border-t-[.1em]">
        <div className="h-6 bg-sky-700"></div>
        <div className="h-min bg-zinc-900 flex flex-wrap justify-center gap-1 p-2">
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
      </div>
    );
  },
  (o, n) => o.toolname === n.toolname,
);
