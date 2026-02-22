import { memo } from "react";
import { ToolCtx } from "../tools/Tool";
import { ProjectManager } from "../ProjectManager";
import { BtnArray, BtnArrEl } from "./BtnArray";

export const TopBarBtns = memo(function TopBarBtns({
  ctx,
}: {
  ctx: ToolCtx<any>;
}) {
  return (
    <BtnArray>
      <BtnArrEl
        onClick={() => ctx.projectRef.current.advanceTickToCallback(ctx)}
      >
        Advance
      </BtnArrEl>
      <BtnArrEl
        onClick={() =>
          navigator.clipboard.writeText(
            JSON.stringify(ctx.projectRef.current.exportProject()),
          )
        }
      >
        Salva
      </BtnArrEl>
      <BtnArrEl
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
