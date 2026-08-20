import { ButtonHTMLAttributes, DetailedHTMLProps, memo } from "react";

export const BtnArrEl = memo(function BtnArrEl({
  children,
  className,
  ...props
}: DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>) {
  return (
    <button
      className={
        "px-4 h-9 hover:brightness-120 active:brightness-125 " +
        (className ?? "")
      }
      {...props}
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
