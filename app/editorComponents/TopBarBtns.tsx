import { memo, useCallback } from "react";
import { ToolCtx } from "../tools/Tool";
import { BtnArray, BtnArrEl } from "./reusable/BtnArray";
import { ProjectManager } from "../Project";
import SimulationManager from "../ProjectManager/SimulationManager";
import { convert, currVersion } from "../projectLoader";
import { throwString } from "../common";

export const TopBarBtns = memo(function TopBarBtns({
  ctx,
  tickRef,
}: {
  ctx: ToolCtx;
  tickRef: SimulationManager["_tickRef"];
}) {
  const CLASSNAME = "bg-ontopbar";
  const projectRef = ctx.projectRef;
  return (
    <BtnArray>
      <BtnArrEl
        className={CLASSNAME}
        onClick={useCallback(() => {
          const proj = projectRef.current.exportProject();
          proj.version = currVersion;
          const blob = new Blob([JSON.stringify(proj)], {
            type: "application/json",
          });

          const url = window.URL.createObjectURL(blob);

          downloadURL(url, getFilename());

          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        }, [projectRef])}
      >
        Salva
      </BtnArrEl>
      <BtnArrEl
        className={CLASSNAME}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.onchange = async () => {
            try {
              const json = (await input.files?.item(0)?.text())!;
              const { version, ...proj } = JSON.parse(json);
              if (!convert(version, proj))
                throwString(`Versione progetto (${version}) non supportata`);
              projectRef.current = ProjectManager.fromSerialized(proj, tickRef);
              ctx.updateProject();
            } catch (e: unknown) {
              alert("Impossibile caricare il progetto: " + e);
            } finally {
              input.remove();
            }
          };
          input.click();
        }}
      >
        Carica
      </BtnArrEl>
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
        Copia
      </BtnArrEl>
      <BtnArrEl
        className={CLASSNAME}
        onClick={async () => {
          projectRef.current = ProjectManager.fromSerialized(
            JSON.parse(await navigator.clipboard.readText()),
            tickRef,
          );
          ctx.updateProject();
        }}
      >
        Incolla
      </BtnArrEl>
    </BtnArray>
  );
});

function getFilename(): string {
  const now = new Date();

  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((it) => it.toString().padStart(2, "0"))
    .join("");
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((it) => it.toString().padStart(2, "0"))
    .join("-");

  return `project ${date} ${time}.json`;
}

function downloadURL(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.style.display = "none";
  a.click();
  a.remove();
}
