import { memo, ReactNode } from "react";
import { TOOL_LIST, TOOLS } from "../tools/Tool";
import { WrapToolIcon } from "../tools/TOOL_ICONS";

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
      <div className="fixed bottom-0 left-[35.3%] w-[29.4%] h-[90px] indent-[1,5em] z-0 border-solid border-sky-800 border-t-[.1em]">
        <div className="h-[20%] bg-sky-700"></div>
        <div className="h-[80%] bg-zinc-900 flex flex-wrap justify-center">
          {TOOL_LIST.map((it) => (
            <button
              key={it}
              onClick={() => setToolTo(it)}
              className={
                (it == toolname ? "bg-gray-600" : "") +
                " w-16 border-solid border-[.1em] border-white m-[2.5%] "
              }
            >
              <WrapToolIcon icon={it} />
              {it}
            </button>
          ))}
        </div>
      </div>
    );
  },
  (o, n) => o.toolname === n.toolname,
);
