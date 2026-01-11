import { memo, RefObject } from "react";
import { ToolCtx } from "../tools/Tool";
import { ProjectManager } from "../ProjectManager";
import { BtnArray, BtnArrEl } from "./BtnArray";

export type TopBarBtnsParams = RefObject<{
  ctx: ToolCtx<any>;
  setProject: (p: ProjectManager) => void;
}>;

export const TopBarBtns = memo(function TopBarBtns({
  ref,
}: {
  ref: TopBarBtnsParams;
}) {
  return (
    <BtnArray>
      <BtnArrEl
        onClick={() =>
          ref.current.ctx.project.advanceTickToCallback(ref.current.ctx)
        }
      >
        Advance
      </BtnArrEl>
      <BtnArrEl
        onClick={() =>
          navigator.clipboard.writeText(
            JSON.stringify(ref.current.ctx.project.exportProject()),
          )
        }
      >
        Salva
      </BtnArrEl>
      <BtnArrEl
        onClick={async () =>
          ref.current.setProject(
            ProjectManager.fromSerialized(
              JSON.parse(await navigator.clipboard.readText()),
            ),
          )
        }
      >
        Carica
      </BtnArrEl>
    </BtnArray>
  );
});
