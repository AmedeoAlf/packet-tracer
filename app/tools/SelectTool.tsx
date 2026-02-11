import { Tool } from "./Tool";
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
  const x = [tool.lastCursorPos[0], tool.selectionRectangle[0]].toSorted(
    (a, b) => a - b,
  );
  const y = [tool.lastCursorPos[1], tool.selectionRectangle[1]].toSorted(
    (a, b) => a - b,
  );

  return (
    x[0] < dev.pos[0] &&
    dev.pos[0] < x[1] &&
    y[0] < dev.pos[1] &&
    dev.pos[1] < y[1]
  );
}

export function isDecalHighlighted(tool: SelectTool, dec: Decal) {
  if (tool.selectedDecals.has(dec.id)) return true;
  if (!tool.lastCursorPos || !tool.selectionRectangle) return false;

  // Check if it is part of the selection rectangle
  const x = [tool.lastCursorPos[0], tool.selectionRectangle[0]].toSorted(
    (a, b) => a - b,
  );
  const y = [tool.lastCursorPos[1], tool.selectionRectangle[1]].toSorted(
    (a, b) => a - b,
  );

  return (
    x[0] < dec.pos[0] &&
    dec.pos[0] < x[1] &&
    y[0] < dec.pos[1] &&
    dec.pos[1] < y[1]
  );
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
        x: Math.min(ctx.tool.selectionRectangle[0], ctx.tool.lastCursorPos[0]),
        y: Math.min(ctx.tool.selectionRectangle[1], ctx.tool.lastCursorPos[1]),
        width: Math.abs(
          ctx.tool.selectionRectangle[0] - ctx.tool.lastCursorPos[0],
        ),
        height: Math.abs(
          ctx.tool.selectionRectangle[1] - ctx.tool.lastCursorPos[1],
        ),
      };
      return (
        <rect {...props} className="fill-blue-400/10 stroke-blue-200" rx={6} />
      );
    },
    panel: (ctx) => {
      switch (ctx.tool.selected.size + ctx.tool.selectedDecals.size) {
        case 0:
          return;
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
                    ctx.toolRef.current.stdin = stdin;
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
            if (
              !ev.shiftKey &&
              !ctx.toolRef.current.selected.has(ev.device.id)
            ) {
              ctx.toolRef.current.selected.clear();
              ctx.toolRef.current.selectedDecals.clear();
            }
            ctx.toolRef.current.selected.add(ev.device.id);
            ctx.toolRef.current.lastCursorPos = ev.pos;
          } else if (ev.decal) {
            if (
              !ev.shiftKey &&
              !ctx.toolRef.current.selectedDecals.has(ev.decal.id)
            ) {
              ctx.toolRef.current.selected.clear();
              ctx.toolRef.current.selectedDecals.clear();
            }
            ctx.toolRef.current.selectedDecals.add(ev.decal.id);
            ctx.toolRef.current.lastCursorPos = ev.pos;
          } else {
            if (!ev.shiftKey) {
              ctx.toolRef.current.selected.clear();
              ctx.toolRef.current.selectedDecals.clear();
            }
            ctx.toolRef.current.selectionRectangle = ev.pos;
            ctx.toolRef.current.lastCursorPos = ev.pos;
            ctx.updateTool();
          }
          break;
        case "mousemove":
          if (ctx.toolRef.current.lastCursorPos) {
            if (!ctx.toolRef.current.selectionRectangle) {
              for (const dev of ctx.toolRef.current.selected) {
                ctx.project.mutDevice(dev)!.pos[0] +=
                  ev.pos[0] - ctx.toolRef.current.lastCursorPos[0];
                ctx.project.mutDevice(dev)!.pos[1] +=
                  ev.pos[1] - ctx.toolRef.current.lastCursorPos[1];
              }
              for (const dec of ctx.toolRef.current.selectedDecals) {
                ctx.project.mutDecal(dec)!.pos[0] +=
                  ev.pos[0] - ctx.toolRef.current.lastCursorPos[0];
                ctx.project.mutDecal(dec)!.pos[1] +=
                  ev.pos[1] - ctx.toolRef.current.lastCursorPos[1];
              }
              ctx.updateProject();
            }
            ctx.toolRef.current.lastCursorPos = ev.pos;
            ctx.updateTool();
          }
          break;
        case "mouseup":
          if (ctx.toolRef.current.lastCursorPos) {
            if (ctx.toolRef.current.selectionRectangle) {
              const x = [
                ctx.toolRef.current.selectionRectangle[0],
                ctx.toolRef.current.lastCursorPos[0],
              ].toSorted((a, b) => a - b);
              const y = [
                ctx.toolRef.current.selectionRectangle[1],
                ctx.toolRef.current.lastCursorPos[1],
              ].toSorted((a, b) => a - b);

              ctx.project.immutableDevices
                .values()
                .filter(
                  (it) =>
                    x[0] <= it.pos[0] &&
                    it.pos[0] <= x[1] &&
                    y[0] <= it.pos[1] &&
                    it.pos[1] <= y[1],
                )
                .forEach((it) => ctx.toolRef.current.selected.add(it.id));

              ctx.project.immutableDecals
                .filter(
                  (it) =>
                    it &&
                    x[0] <= it.pos[0] &&
                    it.pos[0] <= x[1] &&
                    y[0] <= it.pos[1] &&
                    it.pos[1] <= y[1],
                )
                .forEach((it) =>
                  ctx.toolRef.current.selectedDecals.add(it!.id),
                );
            } else {
              const diffX = ev.pos[0] - ctx.toolRef.current.lastCursorPos[0];
              const diffY = ev.pos[1] - ctx.toolRef.current.lastCursorPos[1];
              if (diffX || diffY) {
                for (const dev of ctx.toolRef.current.selected) {
                  ctx.project.mutDevice(dev)!.pos[0] += diffX;
                  ctx.project.mutDevice(dev)!.pos[1] += diffY;
                }
                for (const dec of ctx.toolRef.current.selectedDecals) {
                  ctx.project.mutDecal(dec)!.pos[0] += diffX;
                  ctx.project.mutDecal(dec)!.pos[1] += diffY;
                }
                ctx.updateProject();
              }
              ctx.toolRef.current.lastCursorPos = undefined;
            }
          }
          ctx.toolRef.current.lastCursorPos = undefined;
          ctx.toolRef.current.selectionRectangle = undefined;
          ctx.updateTool();
          break;
        case "keydown":
          ev.consumed = true;
          switch (ev.key) {
            case "Delete": {
              for (const s of ctx.toolRef.current.selected) {
                ctx.project.deleteDevice(s);
              }
              for (const s of ctx.toolRef.current.selectedDecals) {
                ctx.project.removeDecal(s);
              }
              ctx.toolRef.current.selected.clear();
              ctx.toolRef.current.selectedDecals.clear();
              ctx.updateTool();
              ctx.updateProject();
              return;
            }
            case "d": {
              const newSelected = new Set<number>();
              for (const s of ctx.toolRef.current.selected) {
                const newId = ctx.project.duplicateDevice(s)!;
                newSelected.add(newId);
                ctx.project.mutDevice(newId)!.pos[0] += 10;
                ctx.project.mutDevice(newId)!.pos[1] += 10;
              }
              const newDecals = new Set<number>();
              for (const s of ctx.toolRef.current.selectedDecals) {
                const newId = ctx.project.duplicateDecal(s)!;
                newDecals.add(newId);
                ctx.project.mutDecal(newId)!.pos[0] += 10;
                ctx.project.mutDecal(newId)!.pos[1] += 10;
              }
              ctx.toolRef.current.selected = newSelected;
              ctx.toolRef.current.selectedDecals = newDecals;
              ctx.updateTool();
              ctx.updateProject();
              return;
            }
            default:
              ev.consumed = false;
          }
      }
      if (
        originalDevices.symmetricDifference(ctx.toolRef.current.selected).size >
          0 ||
        originalDecals.symmetricDifference(ctx.toolRef.current.selectedDecals)
          .size > 0
      ) {
        ctx.toolRef.current.selected = new Set(ctx.toolRef.current.selected);
        ctx.toolRef.current.selectedDecals = new Set(
          ctx.toolRef.current.selectedDecals,
        );
        ctx.updateTool();
      }
    },
  };
}

// TODO: separate correctly args
function TerminalEmulator<State extends InternalState>(
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
