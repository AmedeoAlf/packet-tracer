import { RefObject, useEffect, useLayoutEffect, useState } from "react";
import { ToolCtx } from "../tools/Tool";
import { ProjectManager } from "../ProjectManager";

export function useCanvasSize(
  svgCanvas: RefObject<SVGSVGElement | null>,
): [number, number] | undefined {
  const [canvasSize, setCanvasSize] = useState<[number, number] | undefined>(
    undefined,
  );
  const computeSize = () => {
    if (!svgCanvas.current) return;
    const rect = svgCanvas.current.getBoundingClientRect();
    if (
      !canvasSize ||
      rect.width != canvasSize[0] ||
      rect.height != canvasSize[1]
    )
      setCanvasSize([rect.width, rect.height]);
  };
  useEffect(() => {
    window.onresize = () => computeSize();
  });
  // This is actually a eslint bug, I'm actually complying with the valid case here
  // https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect#valid
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(computeSize, [canvasSize, svgCanvas]);
  return canvasSize;
}

export function useSimulation(toolCtx: ToolCtx, resolution_ms: number) {
  useEffect(() => {
    const timeout = setInterval(() => {
      toolCtx.projectRef.current.runSimulation(toolCtx);
    }, resolution_ms);
    return () => clearInterval(timeout);
  }, [toolCtx, resolution_ms]);
}

export function useAutoSave(
  project: ProjectManager,
  save: (p: ProjectManager) => void,
  delay: number = 500,
): [boolean, (b: boolean) => void] {
  const [shouldSave, setShouldSave] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (shouldSave) save(project);
      setShouldSave(false);
    }, delay);
    window.onbeforeunload = shouldSave ? () => save(project) : null;
    return () => clearTimeout(timeout);
  }, [project, save, shouldSave, delay]);
  return [shouldSave, setShouldSave];
}

export function useNoPinchToZoom() {
  useEffect(() => {
    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) e.preventDefault();
      },
      { passive: false },
    );
  }, []);
}
