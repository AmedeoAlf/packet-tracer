import { memo, ReactNode, useState } from "react";
import { Tool, ToolCtx } from "../tools/Tool";

// La barra laterale dell'interfaccia: il suo contenuto è intermente deciso dal
// tool in uso.
export const SideBar = memo(
  function SideBar({ toolCtx }: { toolCtx: ToolCtx<Tool<object>> }): ReactNode {
    const [open, setOpen] = useState(true);
    const panel = toolCtx.tool.panel(toolCtx);
    return (
      <>
        <div
          className={
            "transition fixed top-[50px] w-1/3 min-w-80 max-w-120 max-h-(--h-spec-cont) right-0 p-3 " +
            (panel && open ? "" : "translate-x-120")
          }
        >
          <div className="bg-zinc-900 p-4 border-zinc-500 border-2 w-full rounded-xl">
            {panel}
          </div>
        </div>
        <button
          className={
            "transition fixed top-[80px] right-0 border-sky-800 bg-sky-700 p-2 rounded-l-full " +
            (panel ? "" : "translate-x-10")
          }
          onClick={() => setOpen(!open)}
        >
          <svg
            width={16}
            height={20}
            className={"transition " + (open ? "-scale-x-100" : "")}
          >
            <path
              d="M 8 18 L 2 10 L 8 2 "
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </>
    );
  },
  (p, n) => p.toolCtx.tool === n.toolCtx.tool,
);
