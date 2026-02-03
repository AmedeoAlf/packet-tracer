import { memo, ReactNode, useState } from "react";
import { Tool, ToolCtx } from "../tools/Tool";

// La barra laterale dell'interfaccia: il suo contenuto è intermente deciso dal
// tool in uso.
export const SideBar = memo(function SideBar({
  toolCtx,
}: {
  toolCtx: ToolCtx<Tool<object>>;
}): ReactNode {
  const [open, setOpen] = useState(true);
  const panel = toolCtx.tool.panel(toolCtx);
  return (
    <>
      <div
        className={
          "transition bg-zinc-900 fixed top-[50px] w-1/3 min-w-80 max-w-120 h-(--h-spec-cont) border-sky-800 border-solid border-t-[.1em] border-l-[.1em] right-0 " +
          (panel && open ? "" : "translate-x-120")
        }
      >
        <div className="bg-sky-700 h-[20px] indent-0"></div>
        {toolCtx.tool.panel(toolCtx)}
      </div>
      <button
        className={
          "transition fixed top-[52px] right-0 border-sky-800 bg-sky-700 p-2 rounded-l-full " +
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
});
