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
      ? "bg-selected border-selected-border "
      : "bg-topbar border-topbar-border hover:brightness-120 ") +
    className;
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
}
