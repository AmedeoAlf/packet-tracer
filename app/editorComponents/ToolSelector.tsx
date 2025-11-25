import { ReactNode } from "react";
import { Tool, TOOL_LIST, TOOLS } from "../tools/Tool";

// Il selettore del tool in uso
export function ToolSelector({ tool, setTool }: { tool: Tool, setTool: (t: Tool) => void }): ReactNode {
  return (<div className="fixed bottom-0 left-[35.3%] w-[29.4%] h-[90px] indent-[1,5em] z-0 border-solid border-sky-800 border-t-[.1em]">
    <div className="h-[20%] bg-sky-700"></div>
    <div className="h-[80%] bg-zinc-900 flex flex-wrap justify-center">

      {TOOL_LIST.map(it => (
          <button 
            key={it} 
            onClick={ev => setTool(TOOLS[it](tool))} 
            className={(it==tool.toolname?"bg-gray-600":"")+" w-16 border-solid border-[.1em] border-white m-[2.5%] "}>
              {it}
            </button>        
      ))}

    </div>
  </div>)
}
