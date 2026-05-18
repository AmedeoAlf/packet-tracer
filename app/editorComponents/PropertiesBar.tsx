import { memo } from "react";
import { ToolCtx } from "../tools/Tool";
import { SideBar } from "./reusable/SideBar";

export const PropertiesBar = memo(
  function PropertiesBar({ toolCtx }: { toolCtx: ToolCtx }) {
    return (
      <SideBar initialWidth={420} rightSide>
        {toolCtx.tool.panel(toolCtx)}
      </SideBar>
    );
  },
  (p, n) => p.toolCtx.tool === n.toolCtx.tool,
);
