import { MouseEventHandler, ReactNode } from "react";

export function SelectableCard({
  isSelected,
  selectedStyle = "bg-selected border-selected-border ",
  unselectedStyle = "bg-selectable border-selectable-border hover:brightness-120 ",
  onClick,
  className,
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  isSelected: boolean;
  onClick: MouseEventHandler;
  className?: string;
  selectedStyle?: string;
  unselectedStyle?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
}): ReactNode {
  className =
    "transition p-1 rounded-sm border-3 select-none flex flex-col items-center " +
    (isSelected ? selectedStyle : unselectedStyle) +
    " " +
    className;
  return (
    <button
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </button>
  );
}
