import { MouseEventHandler, ReactNode } from "react";

export function SelectableCard({
  isSelected,
  selectedStyle = "bg-selected border-selected-border ",
  unselectedStyle = "bg-selectable border-selectable-border hover:brightness-120 ",
  onClick,
  className,
  children,
}: {
  isSelected: boolean;
  onClick: MouseEventHandler;
  className?: string;
  selectedStyle?: string;
  unselectedStyle?: string;
  children: ReactNode;
}): ReactNode {
  className =
    "transition p-1 rounded-sm border-3 select-none flex flex-col items-center " +
    (isSelected ? selectedStyle : unselectedStyle) +
    " " +
    className;
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
}
