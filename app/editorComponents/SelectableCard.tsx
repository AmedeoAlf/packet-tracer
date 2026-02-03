import { MouseEventHandler, ReactNode } from "react";

export function SelectableCard({
  isSelected,
  onClick,
  className,
  children,
}: {
  isSelected: boolean;
  onClick: MouseEventHandler;
  className?: string;
  children: ReactNode;
}): ReactNode {
  className =
    "transition p-1 rounded-sm border-3 select-none flex flex-col items-center " +
    (isSelected
      ? "bg-sky-900 border-sky-800 "
      : "bg-slate-800 border-slate-700 hover:bg-slate-700 ") +
    className;
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
}
