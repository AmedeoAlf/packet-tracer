import { ReactNode } from "react";

export function Button({
  onClick,
  className: extraClass,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      className={
        "h-8 rounded-md font-bold px-2 " +
        (onClick ? "hover:brightness-110 " : "") +
        (extraClass ?? "")
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}
