import { memo, ReactNode } from "react";

export const BtnArrEl = memo(function BtnArrEl({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 h-9 bg-gray-600 hover:bg-gray-700 active:bg-gray-800"
    >
      {children}
    </button>
  );
});
export function BtnArray({
  children,
}: {
  children: ReturnType<typeof BtnArrEl>[];
}) {
  return (
    <div className="inline-flex gap-1 rounded-xl overflow-hidden size-max">
      {children}
    </div>
  );
}
