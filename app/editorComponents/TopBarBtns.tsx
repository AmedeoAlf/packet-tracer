import { memo, useCallback } from "react";
import { ToolCtx } from "../tools/Tool";
import { BtnArray, BtnArrEl } from "./reusable/BtnArray";
import { ProjectManager } from "../Project";

export const TopBarBtns = memo(function TopBarBtns({
  ctx: { projectRef, updateProject },
  tickRef,
}: {
  ctx: ToolCtx;
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
