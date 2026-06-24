import { BtnArray, BtnArrEl } from "@/app/editorComponents/reusable/BtnArray";
import { ReactNode } from "react";

function Square(props: { size: number; x: number; y: number }) {
  const { size, ...other } = props;
  return <rect width={size} height={size} rx={1} ry={1} {...other} />;
}

function Path(props: { d: string }) {
  return <path strokeLinejoin="round" strokeLinecap="round" {...props} />;
}

function VLine({ x, from, to }: { x: number; from: number; to: number }) {
  return <line x1={x} x2={x} y1={from} y2={to} strokeLinecap="round" />;
}

export default function SelectionActions({
  duplicate,
  del,
  className,
  children,
}: {
  duplicate: () => void;
  del: () => void;
  className?: string;
  children: ReactNode;
}) {
  const CLASSNAME = "bg-onsidebar flex-1";
  return (
    <div
      className={
        "flex w-full items-center stroke-foreground fill-none " +
        (className ?? "")
      }
    >
      {children}
      <BtnArray>
        <BtnArrEl className={CLASSNAME} onClick={duplicate}>
          <svg width={20} height={20} viewBox="0 0 10 10">
            <Square size={6} x={1} y={1} />
            <Square size={6} x={3} y={3} />
          </svg>
        </BtnArrEl>
        <BtnArrEl className={CLASSNAME} onClick={del}>
          <svg width={20} height={20} viewBox="0 0 12 12">
            <Path d="M 2.5 1.5 H 6 v -0.5 v 0.5 H 9.5" />
            <VLine x={7} from={4.6} to={9.4} />
            <VLine x={5} from={4.6} to={9.4} />
            <Path d="M 2 3 l 1 1 V 10 q 0,1 1,1 H 8 q 1,0 1,-1 V 4 l 1 -1 z" />
          </svg>
        </BtnArrEl>
      </BtnArray>
    </div>
  );
}
