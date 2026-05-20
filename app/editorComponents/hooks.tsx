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

export function useHistory<T>(restoreTo: (t: T) => void): (t: T) => void {
  const [history, setHistory] = useState<T[]>([]);
  const [lookBack, setLookBack] = useState(0);
  console.log(
    ...history.map((it) =>
      (it as ProjectManager).immutableDevices.keys().toArray(),
    ),
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.key == "z" || e.key == "Z" && e.ctrlKey)) return;
      e.preventDefault();
      const newLookback = e.shiftKey ? Math.min(lookBack + 1, 0) : Math.max(lookBack - 1, -history.length);
      setLookBack(newLookback);
      const target = history.at(newLookback);
      if (target) restoreTo(target);
      console.log(newLookback);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, lookBack, restoreTo]);

  return (t) => {
    const arr = history.slice(0, history.length + lookBack);
    arr.push(t);
    setHistory(arr);
    setLookBack(0);
  };
}
