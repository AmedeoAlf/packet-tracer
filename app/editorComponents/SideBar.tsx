import { memo, ReactNode, useEffect, useState } from "react";
import { Tool, ToolCtx } from "../tools/Tool";

// La barra laterale dell'interfaccia: il suo contenuto è intermente deciso dal
// tool in uso.
export const SideBar = memo(
  function SideBar({ toolCtx }: { toolCtx: ToolCtx<Tool<object>> }): ReactNode {
    const [open, setOpen] = useState(true);
    const [resizing, setResizing] = useState(false);
    const [width, setWidth] = useState(420);
    const panel = toolCtx.tool.panel(toolCtx);
    useEffect(() => {
      const events = {
        mousedown: (ev) => {
          if (!(ev.target instanceof HTMLDivElement)) return;
          if (ev.target.id != "sidebarResizeHandle") return;
          setResizing(true);
        },
        ...(resizing
          ? {
              mousemove: (ev) =>
                setWidth((width) =>
                  Math.min(
                    window.innerWidth - 100,
                    Math.max(300, width - ev.movementX),
                  ),
                ),
              mouseup: () => setResizing(false),
            }
          : {}),
      } as const satisfies Partial<{
        [K in keyof DocumentEventMap]: (
          this: Document,
          ev: DocumentEventMap[K],
        ) => any;
      }>;
      Object.entries(events).forEach(([k, v]) =>
        document.addEventListener(k as keyof DocumentEventMap, v as any),
      );

      return () =>
        Object.entries(events).forEach(([k, v]) =>
          document.removeEventListener(k as keyof DocumentEventMap, v as any),
        );
    }, [setWidth, resizing, setResizing]);
    return (
      <>
        <div
          className={
            "transition fixed top-[50px] h-(--h-spec-cont) right-0 p-3 pointer-events-none " +
            (panel && open ? "" : "translate-x-full")
          }
          style={{ width }}
        >
          <div className="bg-zinc-900 p-4 border-zinc-500 border-2 w-full pl-5 rounded-xl pointer-events-auto overflow-y-auto h-max max-h-full">
            <div className="absolute top-0 left-4 h-full py-4">
              <div
                id="sidebarResizeHandle"
                className="w-3 z-1 h-full select-none box-border flex items-center justify-center group"
              >
                <div
                  className={
                    "transition-all bg-slate-100 w-1 rounded-full pointer-events-none " +
                    (resizing ? "h-7" : "h-10 group-hover:h-9")
                  }
                ></div>
              </div>
            </div>
            {panel}
          </div>
        </div>
        <button
          className={
            `transition fixed top-[50px] right-0 w-6 h-(--h-spec-cont)
            bg-radial-[at_100%_50%] from-sky-700 to-transparent to-60%
            hover:to-80% ` + (panel ? "" : "translate-x-10")
          }
          onClick={() => setOpen(!open)}
        >
          <svg
            width={10}
            height={20}
            className={"m-3 transition " + (open ? "-scale-x-100" : "")}
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
