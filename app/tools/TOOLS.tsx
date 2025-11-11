import { makeAddTool } from "./AddTool";
import { makeHandTool } from "./HandTool";
import { makeSelectTool } from "./SelectTool";
import { Tool, ToolCtx } from "./Tool";

export const TOOLS = {
  select: makeSelectTool,
  add: makeAddTool,
  hand: makeHandTool
} satisfies Record<string, (ctx: ToolCtx) => Tool>;

export const TOOL_LIST = ['select', 'add', 'hand'] as const satisfies (keyof typeof TOOLS)[];

