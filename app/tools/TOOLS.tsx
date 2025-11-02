import { AddTool } from "./AddTool";
import { SelectTool } from "./SelectTool";
import { Tool } from "./Tool";

export const TOOLS: Tool[] = [SelectTool, AddTool]

export const toolFromToolName = Object.fromEntries(TOOLS.map(it => [it.toolname, it]))
