import { memo, ReactNode } from "react";

export const BtnArrEl = memo(function BtnArrEl({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 h-9 hover:brightness-120 active:brightness-125 " +
        (className ?? "")
      }
    >
      {children}
    </button>
  );
});
export function BtnArray({
  children,
  className,
}: {
  children: ReturnType<typeof BtnArrEl>[];
  className?: string;
}) {
  return (
    <div
      className={
        "inline-flex gap-1 rounded-xl overflow-hidden size-max " +
        (className ?? "")
      }
    >
      {children}
    </div>
  );
}
