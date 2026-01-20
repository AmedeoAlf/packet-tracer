import { Tool, ToolCtx } from "./Tool";
import {
  buildEmulatorContext,
  DevicePanel,
  EmulatorContext,
  getAutoComplete,
  InternalState,
  runOnInterpreter,
} from "../emulators/DeviceEmulator";
import { Coords } from "../common";
import { Device } from "../devices/Device";
import { Decal } from "../Project";

export type SelectTool = Tool<{
  selected: Set<number>;
  selectedDecals: Set<number>;
  lastCursorPos?: Coords;
  // User is in rectangle selection if this is not undefined
  selectionRectangle?: Coords;
  stdout: string;
  stdin: string;
}>;

export function isSelectTool(tool: Tool<any>): tool is SelectTool {
  return tool.toolname == "select";
}

export function isDeviceHighlighted(tool: SelectTool, dev: Device) {
  if (tool.selected.has(dev.id)) return true;
  if (!tool.lastCursorPos || !tool.selectionRectangle) return false;

  // Check if it is part of the selection rectangle
  const x = [tool.lastCursorPos.x, tool.selectionRectangle.x].toSorted();
  const y = [tool.lastCursorPos.y, tool.selectionRectangle.y].toSorted();

  return x[0] < dev.pos.x && dev.pos.x < x[1] &&
    y[0] < dev.pos.y && dev.pos.y < y[1]
}

export function isDecalHighlighted(tool: SelectTool, dec: Decal) {
  if (tool.selectedDecals.has(dec.id)) return true;
  if (!tool.lastCursorPos || !tool.selectionRectangle) return false;

  // Check if it is part of the selection rectangle
  const x = [tool.lastCursorPos.x, tool.selectionRectangle.x].toSorted();
  const y = [tool.lastCursorPos.y, tool.selectionRectangle.y].toSorted();

  return x[0] < dec.pos.x && dec.pos.x < x[1] &&
    y[0] < dec.pos.y && dec.pos.y < y[1]
}

export function makeSelectTool(prev: SelectTool | object = {}): SelectTool {
  return {
    selected: new Set<number>(),
    selectedDecals: new Set<number>(),
    stdin: "",
    stdout: "= Terminal emulator =",
    lastCursorPos: undefined,
    ...prev,
    toolname: "select",
    svgElements: (ctx) => {
      if (!ctx.tool.selectionRectangle || !ctx.tool.lastCursorPos) return <></>;
      const props = {
        x: Math.min(ctx.tool.selectionRectangle.x, ctx.tool.lastCursorPos.x),
        y: Math.min(ctx.tool.selectionRectangle.y, ctx.tool.lastCursorPos.y),
        width: Math.abs(
          ctx.tool.selectionRectangle.x - ctx.tool.lastCursorPos.x,
        ),
        height: Math.abs(
          ctx.tool.selectionRectangle.y - ctx.tool.lastCursorPos.y,
        ),
      };
      return (
        <rect {...props} className="fill-blue-400/10 stroke-blue-200" rx={6} />
      );
    },
    panel: (ctx) => {
      switch (ctx.tool.selected.size + ctx.tool.selectedDecals.size) {
        case 0:
          return (
            <p className="h-8 rounded-md font-bold m-2 px-2 p-1 bg-gray-800 text-gray-500 text-center">
              Seleziona un dispositivo per vedere le proprietà
            </p>
          );
        case 1:
          if (ctx.tool.selected.size === 1) {
            const device = ctx.project.immutableDevices.get(
              ctx.tool.selected.values().next().value!,
            )!;
            const emulator = device.emulator;
            const emuCtx = buildEmulatorContext(device, ctx);
            // ctx.write = (msg) => {
            //   ctx.tool.stdout += "\n" + msg;
            //   ctx.updateTool();
            // };

            const panels: [string, DevicePanel<any>][] = [
              [
                "terminal",
                TerminalEmulator(
                  ctx.tool.stdin,
                  (stdin) => {
                    ctx.tool.stdin = stdin;
                    ctx.updateTool();
                  },
                  ctx.tool.stdout,
                ),
              ],
              ...Object.entries(emulator.configPanel),
            ];
            return (
              <div>
                <input
                  className="text-xl font-bold"
                  type="text"
                  value={device.name}
                  onChange={(ev) => {
                    device.name = ev.target.value;
                    emuCtx.updateState();
                  }}
                />{" "}
                ✏️
                {panels.map(([k, v]) => (
                  <div key={k} className="mb-2">
                    <h2 className="text-lg font-bold">{k}</h2> <hr />
                    {v(emuCtx)}
                  </div>
                ))}
              </div>
            );
          } else {
            const decal = ctx.tool.selectedDecals.values().next().value!;
            const offsetSelection = (of: number) => () => {
              ctx.tool.selectedDecals = new Set([
                ctx.project.moveDecalIdx(decal, of),
              ]);
              console.log(decal, ctx.tool.selectedDecals.values().next().value);
              ctx.updateProject();
              ctx.updateTool();
            };
            return (
              <div>
                <input
                  type="button"
                  value="Sposta su"
                  onClick={offsetSelection(1)}
                />{" "}
                <br />
                <input
                  type="button"
                  value="Sposta giù"
                  onClick={offsetSelection(-1)}
                />
              </div>
            );
          }
        default:
          return <p>Non ancora implementato</p>;
      }
    },
    onEvent: (ctx, ev) => {
      const originalDevices = new Set(ctx.tool.selected);
      const originalDecals = new Set(ctx.tool.selectedDecals);
      switch (ev.type) {
        case "mousedown":
          if (ev.device) {
            if (!ev.shiftKey && !ctx.tool.selected.has(ev.device.id)) {
              ctx.tool.selected.clear();
              ctx.tool.selectedDecals.clear();
            }
            ctx.tool.selected.add(ev.device.id);
            ctx.tool.lastCursorPos = ev.pos;
          } else if (ev.decal) {
            if (!ev.shiftKey && !ctx.tool.selectedDecals.has(ev.decal.id)) {
              ctx.tool.selected.clear();
              ctx.tool.selectedDecals.clear();
            }
            ctx.tool.selectedDecals.add(ev.decal.id);
            ctx.tool.lastCursorPos = ev.pos;
          } else {
            if (!ev.shiftKey) {
              ctx.tool.selected.clear();
              ctx.tool.selectedDecals.clear();
            }
            ctx.tool.selectionRectangle = ev.pos;
            ctx.tool.lastCursorPos = ev.pos;
            ctx.updateTool();
          }
          break;
        case "mousemove":
          if (ctx.tool.lastCursorPos) {
            if (!ctx.tool.selectionRectangle) {
              for (const dev of ctx.tool.selected) {
                ctx.project.mutDevice(dev)!.pos.x +=
                  ev.pos.x - ctx.tool.lastCursorPos.x;
                ctx.project.mutDevice(dev)!.pos.y +=
                  ev.pos.y - ctx.tool.lastCursorPos.y;
              }
              for (const dec of ctx.tool.selectedDecals) {
                ctx.project.mutDecal(dec)!.pos.x +=
                  ev.pos.x - ctx.tool.lastCursorPos.x;
                ctx.project.mutDecal(dec)!.pos.y +=
                  ev.pos.y - ctx.tool.lastCursorPos.y;
              }
              ctx.updateProject();
            }
            ctx.tool.lastCursorPos = ev.pos;
            ctx.updateTool();
          }
          break;
        case "mouseup":
          if (ctx.tool.selectionRectangle) {
            ctx.tool.selectionRectangle = undefined;
          } else if (ctx.tool.lastCursorPos) {
            const diffX = ev.pos.x - ctx.tool.lastCursorPos.x;
            const diffY = ev.pos.y - ctx.tool.lastCursorPos.y;
            if (diffX || diffY) {
              for (const dev of ctx.tool.selected) {
                ctx.project.mutDevice(dev)!.pos.x += diffX;
                ctx.project.mutDevice(dev)!.pos.y += diffY;
              }
              for (const dec of ctx.tool.selectedDecals) {
                ctx.project.mutDecal(dec)!.pos.x += diffX;
                ctx.project.mutDecal(dec)!.pos.y += diffY;
              }
              ctx.updateProject();
            }
          }
          ctx.tool.lastCursorPos = undefined;
          ctx.updateTool();
          break;
        case "keydown":
          ev.consumed = true;
          switch (ev.key) {
            case "Delete": {
              for (const s of ctx.tool.selected) {
                ctx.project.deleteDevice(s);
              }
              for (const s of ctx.tool.selectedDecals) {
                ctx.project.removeDecal(s);
              }
              ctx.tool.selected.clear();
              ctx.tool.selectedDecals.clear();
              ctx.updateTool();
              ctx.updateProject();
              return;
            }
            case "d": {
              const newSelected = new Set<number>();
              for (const s of ctx.tool.selected) {
                const newId = ctx.project.duplicateDevice(s)!;
                newSelected.add(newId);
                ctx.project.mutDevice(newId)!.pos.x += 10;
                ctx.project.mutDevice(newId)!.pos.y += 10;
              }
              const newDecals = new Set<number>();
              for (const s of ctx.tool.selectedDecals) {
                const newId = ctx.project.duplicateDecal(s)!;
                newDecals.add(newId);
                ctx.project.mutDecal(newId)!.pos.x += 10;
                ctx.project.mutDecal(newId)!.pos.y += 10;
              }
              ctx.tool.selected = newSelected;
              ctx.tool.selectedDecals = newDecals;
              ctx.updateTool();
              ctx.updateProject();
              return;
            }
            default:
              ev.consumed = false;
          }
      }
      if (
        originalDevices.symmetricDifference(ctx.tool.selected).size > 0 ||
        originalDecals.symmetricDifference(ctx.tool.selectedDecals).size > 0
      ) {
        ctx.tool.selected = new Set(ctx.tool.selected);
        ctx.tool.selectedDecals = new Set(ctx.tool.selectedDecals);
        ctx.updateTool();
      }
    },
  };
}

// TODO: separate correctly args
function TerminalEmulator<State extends InternalState<object>>(
  inputBar: string,
  setInputBar: (s: string) => void,
  content: string,
): DevicePanel<State> {
  return function TerminalEmulator(ctx: EmulatorContext<State>) {
    const setInput = (s: string) => {
      if (!s.endsWith("?")) {
        setInputBar(s);
        return;
      }
      const lastArg = getAutoComplete({ ...ctx, args: inputBar.split(" ") });
      if (lastArg) {
        const args = s.split(" ");
        args[args.length - 1] = lastArg;
        setInputBar(args.join(" ") + " ");
      }
    };
    return (
      <div className="font-mono">
        <textarea
          ref={(area) => {
            if (area) area.scrollTop = area.scrollHeight;
          }}
          value={content}
          rows={8}
          cols={50}
          readOnly
        />
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            ctx.write("> " + inputBar);
            runOnInterpreter({
              args: inputBar.split(" "),
              ...ctx,
            });
            setInput("");
          }}
        >
          <input
            type="text"
            value={inputBar}
            placeholder=">"
            className="w-full bg-gray-700"
            onKeyDown={(ev) => {
              if (ev.key != "Tab") return;
              ev.preventDefault();
              const lastArg = getAutoComplete({
                ...ctx,
                args: inputBar.split(" "),
              });
              if (lastArg) {
                const args = inputBar.split(" ");
                args[args.length - 1] = lastArg;
                setInput(args.join(" "));
              }
            }}
            onChange={(ev) => setInput(ev.target.value)}
          />
        </form>
      </div>
    );
  };
}
