import { ReactNode } from "react";
import { Tool, TOOL_LIST, TOOLS } from "../tools/Tool";

// Il selettore del tool in uso
export function ToolSelector({ tool, setTool }: { tool: Tool, setTool: (t: Tool) => void }): ReactNode {
  return (<div className="fixed bottom-0 left-[35.3%] w-[29.4%] h-[90px] indent-[1,5em] z-0 border-solid border-sky-800 border-t-[.1em]">
    <div className="h-[20%] bg-sky-700"></div>
    <div className="h-[80%] bg-zinc-900">

      <div id="box" className="w-[20%] h-[] border-solid border-[.1em] border-white-600 m-[2.5%]">

        
      </div>

      <select value={tool.toolname} onChange={ev => setTool(TOOLS[ev.target.value as keyof typeof TOOLS](tool))}>
        {TOOL_LIST.map(it => (<option value={it} key={it}>{it}</option>))}
      </select>
    </div>
  </div>)
}
