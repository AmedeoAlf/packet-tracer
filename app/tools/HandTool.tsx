import { Tool, ToolConstructor } from "./Tool";

export type HandTool = Tool<HandTool> & { holding: boolean };

export const makeHandTool: ToolConstructor<HandTool> = (
  prev: HandTool | object = {},
): HandTool => {
  return {
    holding: false,
    ...prev,
    toolname: "hand",
    panel: (ctx) => {
      return (
        <div className="h-8 rounded-md font-bold m-2 px-2 p-1">
          Zoom level:&nbsp;
          <input
            className="text-center w-15 rounded-md bg-primary"
            type="number"
            min={0}
            max={500}
            step={10}
            value={Math.round(ctx.project.viewBoxZoom * 100)}
            onChange={(ev) => {
              ctx.projectRef.current.viewBoxZoom = +ev.target.value / 100;
              ctx.updateProject();
              ctx.updateTool();
            }}
          />
          %
        </div>
      );
    },
    onEvent: (ctx, ev) => {
      switch (ev.type) {
        case "mousedown":
          ctx.toolRef.current.holding = true;
          break;
        case "mouseup":
          ctx.toolRef.current.holding = false;
          ctx.revertTool();
          break;
        case "mousemove":
          if (ctx.toolRef.current.holding) {
            ctx.projectRef.current.viewBoxX -=
              ev.movement[0] / ctx.projectRef.current.viewBoxZoom;
            ctx.projectRef.current.viewBoxY -=
              ev.movement[1] / ctx.projectRef.current.viewBoxZoom;
            ctx.updateProject();
          }
          break;
      }
    },
    svgElements() {
      return <></>;
    },
  };
};
