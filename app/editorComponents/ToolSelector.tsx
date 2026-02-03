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
      <div className="fixed bottom-1 w-full flex justify-center pointer-events-none">
        <div className="bg-slate-800 w-max h-min flex flex-wrap justify-center gap-1 p-2 rounded-2xl pointer-events-auto">
          {TOOL_LIST.map((it) => (
            <SelectableCard
              key={it}
              onClick={() => setToolTo(it)}
              isSelected={it == toolname}
              className={
                "h-min p-2 rounded-xl" +
                (it == toolname ? "" : " border-transparent")
              }
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
