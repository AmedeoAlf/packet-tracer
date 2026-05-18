import { ReactNode, useEffect, useRef, useState } from "react";

// La barra laterale dell'interfaccia: il suo contenuto è intermente deciso dal
// tool in uso.
export function SideBar({
  rightSide,
  children,
  initialWidth = 420,
  minWidth = 300,
}: {
  rightSide?: boolean;
  children: ReactNode;
  initialWidth?: number;
  minWidth?: number;
}) {
  const resizeBarRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const [resizing, setResizing] = useState(false);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    if (!resizing) return;
    const mousemove = (ev: MouseEvent) =>
      setWidth((width) =>
        Math.min(
          window.innerWidth - 100,
          Math.max(
            minWidth,
            rightSide ? width - ev.movementX : width + ev.movementX,
          ),
        ),
      );
    const mouseup = () => setResizing(false);
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
    return () => {
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
    };
  }, [resizing, minWidth, rightSide, setResizing, setWidth]);

  useEffect(() => {
    const mousedown = (ev: MouseEvent) => {
      if (!(ev.target instanceof HTMLDivElement)) return;
      if (ev.target != resizeBarRef.current) return;
      setResizing(true);
    };
    document.addEventListener("mousedown", mousedown);
    return () => document.removeEventListener("mousedown", mousedown);
  }, [setResizing]);

  return (
    <>
      <div
        className={
          `transition fixed top-12.5 h-(--h-spec-cont) ${rightSide ? "right-0" : "left-0"} p-3 pointer-events-none ` +
          (children && open
            ? ""
            : rightSide
              ? "translate-x-full"
              : "-translate-x-full")
        }
        style={{ width }}
      >
        <div className="bg-sidebar p-4 border-zinc-500 border-2 w-full pl-5 rounded-xl pointer-events-auto h-max max-h-full relative">
          <div
            className={`absolute top-0 ${rightSide ? "left-0" : "right-0"} h-full py-4`}
          >
            <div
              ref={resizeBarRef}
              className="w-3 z-1 h-full select-none box-border flex items-center justify-center group"
            >
              <div
                className={
                  "transition-all bg-foreground w-1 rounded-full pointer-events-none " +
                  (resizing ? "h-7" : "h-10 group-hover:h-9")
                }
              ></div>
            </div>
          </div>
          <div className="overflow-y-auto">{children}</div>
        </div>
      </div>
      <button
        className={
          `transition fixed top-12.5 ${rightSide ? "right-0" : "-scale-x-100 left-0"} w-6 h-(--h-spec-cont)
            bg-radial-[at_100%_50%] from-sky-700 to-transparent to-60%
            hover:to-80% ` +
          (children ? "" : rightSide ? "translate-x-10" : "-translate-x-10")
        }
        onClick={() => setOpen(!open)}
      >
        <svg
          width={10}
          height={20}
          className={
            "m-3 transition stroke-foreground " + (open ? "-scale-x-100" : "")
          }
        >
          <path
            d="M 8 18 L 2 10 L 8 2 "
            strokeWidth="2"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </>
  );
}
