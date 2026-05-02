import { memo, useCallback } from "react";
import { AnyTool, ToolCtx } from "../tools/Tool";
import { ProjectManager } from "../ProjectManager";
import { BtnArray, BtnArrEl } from "./BtnArray";

export const TopBarBtns = memo(function TopBarBtns({
  ctx: { projectRef, updateProject },
  tickRef,
}: {
  ctx: ToolCtx<AnyTool>;
  tickRef: ProjectManager["tickRef"];
}) {
  const CLASSNAME = "bg-ontopbar";
  return (
    <BtnArray>
      <BtnArrEl
        className={CLASSNAME}
        onClick={useCallback(
          () =>
            navigator.clipboard.writeText(
              JSON.stringify(projectRef.current.exportProject()),
            ),
          [projectRef],
        )}
      >
        Salva
      </BtnArrEl>
      <BtnArrEl
        className={CLASSNAME}
        onClick={async () => {
          projectRef.current = ProjectManager.fromSerialized(
            JSON.parse(await navigator.clipboard.readText()),
            tickRef,
          );
          updateProject();
        }}
      >
        Carica
      </BtnArrEl>
    </BtnArray>
  );
});
