import { memo } from "react";
import { ToolCtx } from "../tools/Tool";
import { ProjectManager } from "../ProjectManager";
import { BtnArray, BtnArrEl } from "./BtnArray";

export const TopBarBtns = memo(function TopBarBtns({
  ctx,
}: {
  ctx: ToolCtx<any>;
}) {
  const CLASSNAME = "bg-ontopbar";
  return (
    <BtnArray>
      <BtnArrEl
        className={CLASSNAME}
        onClick={() => ctx.projectRef.current.advanceTickToCallback(ctx)}
      >
        Advance
      </BtnArrEl>
      <BtnArrEl
        className={CLASSNAME}
        onClick={() =>
          navigator.clipboard.writeText(
            JSON.stringify(ctx.projectRef.current.exportProject()),
          )
        }
      >
        Salva
      </BtnArrEl>
      <BtnArrEl
        className={CLASSNAME}
        onClick={async () => {
          const ref = ctx.projectRef;
          ref.current = ProjectManager.fromSerialized(
            JSON.parse(await navigator.clipboard.readText()),
          );
          ctx.updateProject();
        }}
      >
        Carica
      </BtnArrEl>
    </BtnArray>
  );
});
