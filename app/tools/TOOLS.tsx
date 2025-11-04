import { AddTool } from "./AddTool";
import { HandTool } from "./HandTool";
import { SelectTool } from "./SelectTool";
import { Tool } from "./Tool";

export const TOOLS: Tool[] = [SelectTool, AddTool, HandTool] as const;

export const toolFromToolName = Object.fromEntries(TOOLS.map(it => [it.toolname, it]))
