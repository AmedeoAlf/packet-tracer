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
  if (!panel) return <></>;
  return open ? (
    <div className="bg-zinc-900 fixed top-[50px] right-0 w-1/3 min-w-80 max-w-120 h-(--h-spec-cont) border-sky-800 border-solid border-t-[.1em] border-l-[.1em]">
      <div className="bg-sky-700 h-[20px] indent-0">
        <div
          className="fixed right-0 cursor-pointer h-[20px] text-[.85em] pr-[5px] pl-[6px] hover:bg-red-500/80"
          onClick={() => setOpen(false)}
        >
          x
        </div>
      </div>
      {toolCtx.tool.panel(toolCtx)}
    </div>
  ) : (
    <button
      className="fixed top-[50px] right-0 indent-[1.5em] border-sky-800 border-solid border-t-[.1em] border-l-[.1em]"
      onClick={() => setOpen(true)}
    >
      Riapri
    </button>
  );
});
