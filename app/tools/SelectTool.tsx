import { Tool, ToolConstructor } from "./Tool";
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
import { deviceOfIntf, idxOfIntf, ProjectManager } from "../ProjectManager";
import { makeLabelTool } from "./LabelTool";
import { makeRectTool } from "./RectTool";
import { BtnArray, BtnArrEl } from "../editorComponents/BtnArray";
import { ReactNode } from "react";
import { DropDown } from "../editorComponents/DropDown";

export type SelectTool = Tool<{
  selected: Set<number>;
  selectedDecals: Set<number>;
  lastCursorPos?: Coords;
  // User is in rectangle selection if this is not undefined
  selectionRectangle?: Coords;
  stdout: string;
  stdin: string;
  previousCmds: string[];

  currDevicePanel?: string;
  selectingDevicePanel: boolean;
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
    previousCmds: [],
    selectingDevicePanel: true,
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
            const device = ctx.projectRef.current.immutableDevices.get(
              ctx.tool.selected.values().next().value!,
            )!;
            const emulator = device.emulator;
            const emuCtx = buildEmulatorContext(device, ctx);
            // ctx.write = (msg) => {
            //   ctx.tool.stdout += "\n" + msg;
            //   ctx.updateTool();
            // };

            const panels: Record<string, DevicePanel<any>> = {
              terminale: TerminalEmulator(
                ctx.tool.stdin,
                (stdin) => {
                  ctx.toolRef.current.stdin = stdin;
                  ctx.updateTool();
                },
                ctx.tool.stdout,
                ctx.tool.previousCmds,
              ),
              ...emulator.configPanel,
            };
            const selectedPanel =
              ctx.tool.currDevicePanel && ctx.tool.currDevicePanel in panels
                ? ctx.tool.currDevicePanel
                : "terminale";
            return (
              <div className="flex flex-col gap-2">
                <SelectionActions
                  duplicate={() => {
                    duplicateSelection(
                      ctx.toolRef.current,
                      ctx.projectRef.current,
                    );
                    ctx.updateTool();
                    ctx.updateProject();
                  }}
                  del={() => {
                    ctx.projectRef.current.deleteDevice(device.id);
                    ctx.toolRef.current.selected.clear();
                    ctx.updateTool();
                    ctx.updateProject();
                  }}
                >
                  <p className="flex-1">1 dispositivo selezionato</p>
                </SelectionActions>
                <input
                  className="text-xl font-bold flex-1 bg-zinc-800 w-full px-2 py-1 rounded-md border-b"
                  type="text"
                  size={2}
                  value={device.name}
                  onChange={(ev) => {
                    device.name = ev.target.value;
                    emuCtx.updateState();
                  }}
                />
                <DropDown open={ctx.toolRef.current.selectingDevicePanel}
                  setOpen={(open) => {
                    ctx.toolRef.current.selectingDevicePanel = open;
                    ctx.updateTool();
                  }}
                  selected={selectedPanel}
                  setSelected={(panel) => {
                    ctx.toolRef.current.currDevicePanel = panel;
                    ctx.toolRef.current.selectingDevicePanel = false;
                    ctx.updateTool();
                  }}
                  panels={Object.keys(panels)}
                />
                {panels[selectedPanel](emuCtx)}
              </div>
            );
          } else {
            const decal = ctx.toolRef.current.selectedDecals
              .values()
              .next().value!;
            const offsetSelection = (of: number) => () => {
              const newIdx = ctx.projectRef.current.moveDecalIdx(decal, of);
              if (newIdx != -1) {
                ctx.toolRef.current.selectedDecals = new Set([newIdx]);
                ctx.updateProject();
                ctx.updateTool();
              }
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
          return (
            <SelectionActions
              duplicate={() => {
                duplicateSelection(ctx.toolRef.current, ctx.projectRef.current);
                ctx.updateTool();
                ctx.updateProject();
              }}
              del={() => {
                for (const id of ctx.toolRef.current.selected)
                  ctx.projectRef.current.deleteDevice(id);
                ctx.toolRef.current.selected.clear();
                ctx.updateTool();
                ctx.updateProject();
              }}
            >
              <p className="flex-1">
                {ctx.tool.selected.size} dispositivi selezionati
              </p>
            </SelectionActions>
          );
      }
    },
    onEvent: (ctx, ev) => {
      const originalDevices = new Set(ctx.toolRef.current.selected);
      const originalDecals = new Set(ctx.toolRef.current.selectedDecals);

      const self = ctx.toolRef.current;
      switch (ev.type) {
        case "doubleclick":
          if (self.selected.size != 0) return;
          if (self.selectedDecals.size != 1) return;
          const decalIdx = self.selectedDecals.values().next().value!;
          const decal = ctx.projectRef.current.immutableDecals[decalIdx]!;

          const setTool = (constructor: ToolConstructor) => {
            ctx.toolRef.current = constructor(self, ctx.projectRef.current);
            ctx.updateTool();
          };

          switch (decal.type) {
            case "text":
              setTool(makeLabelTool);
              return;
            case "rect":
              setTool(makeRectTool);
              return;
            default:
              return;
          }
        case "mousedown":
          if (ev.device) {
            if (!ev.shiftKey && !self.selected.has(ev.device.id)) {
              self.selected.clear();
              self.selectedDecals.clear();
            }
            self.selected.add(ev.device.id);
            self.lastCursorPos = ev.pos;
          } else if (ev.decal) {
            if (!ev.shiftKey && !self.selectedDecals.has(ev.decal.id)) {
              self.selected.clear();
              self.selectedDecals.clear();
            }
            self.selectedDecals.add(ev.decal.id);
            self.lastCursorPos = ev.pos;
          } else {
            if (!ev.shiftKey) {
              self.selected.clear();
              self.selectedDecals.clear();
            }
            self.selectionRectangle = ev.pos;
            self.lastCursorPos = ev.pos;
            // ctx.updateTool();
          }
          break;
        case "mousemove":
          if (self.lastCursorPos) {
            if (!self.selectionRectangle) {
              for (const dev of self.selected) {
                ctx.projectRef.current.mutDevice(dev)!.pos[0] +=
                  ev.pos[0] - self.lastCursorPos[0];
                ctx.projectRef.current.mutDevice(dev)!.pos[1] +=
                  ev.pos[1] - self.lastCursorPos[1];
              }
              for (const dec of self.selectedDecals) {
                ctx.projectRef.current.mutDecal(dec)!.pos[0] +=
                  ev.pos[0] - self.lastCursorPos[0];
                ctx.projectRef.current.mutDecal(dec)!.pos[1] +=
                  ev.pos[1] - self.lastCursorPos[1];
              }
              ctx.updateProject();
            }
            self.lastCursorPos = ev.pos;
            ctx.updateTool();
          }
          break;
        case "mouseleave":
        case "mouseup":
          if (self.lastCursorPos) {
            if (self.selectionRectangle) {
              const x = [
                self.selectionRectangle[0],
                self.lastCursorPos[0],
              ].toSorted((a, b) => a - b);
              const y = [
                self.selectionRectangle[1],
                self.lastCursorPos[1],
              ].toSorted((a, b) => a - b);

              ctx.projectRef.current.immutableDevices
                .values()
                .filter(
                  (it) =>
                    x[0] <= it.pos[0] &&
                    it.pos[0] <= x[1] &&
                    y[0] <= it.pos[1] &&
                    it.pos[1] <= y[1],
                )
                .forEach((it) => self.selected.add(it.id));

              ctx.projectRef.current.immutableDecals
                .filter(
                  (it) =>
                    it &&
                    x[0] <= it.pos[0] &&
                    it.pos[0] <= x[1] &&
                    y[0] <= it.pos[1] &&
                    it.pos[1] <= y[1],
                )
                .forEach((it) => self.selectedDecals.add(it!.id));
              self.lastCursorPos = undefined;
              self.selectionRectangle = undefined;
              ctx.updateTool();
            } else {
              const diffX = ev.pos[0] - self.lastCursorPos[0];
              const diffY = ev.pos[1] - self.lastCursorPos[1];
              if (diffX || diffY) {
                for (const dev of self.selected) {
                  ctx.projectRef.current.mutDevice(dev)!.pos[0] += diffX;
                  ctx.projectRef.current.mutDevice(dev)!.pos[1] += diffY;
                }
                for (const dec of self.selectedDecals) {
                  ctx.projectRef.current.mutDecal(dec)!.pos[0] += diffX;
                  ctx.projectRef.current.mutDecal(dec)!.pos[1] += diffY;
                }
                ctx.updateProject();
              }
              self.lastCursorPos = undefined;
            }
          }
          break;
        case "keydown":
          ev.consumed = true;
          switch (ev.key) {
            case "Delete": {
              for (const s of self.selected) {
                ctx.projectRef.current.deleteDevice(s);
              }
              for (const s of self.selectedDecals) {
                ctx.projectRef.current.removeDecal(s);
              }
              self.selected.clear();
              self.selectedDecals.clear();
              ctx.updateTool();
              ctx.updateProject();
              return;
            }
            case "d": {
              duplicateSelection(ctx.toolRef.current, ctx.projectRef.current);
              ctx.updateTool();
              ctx.updateProject();
              return;
            }
            default:
              ev.consumed = false;
          }
      }
      if (
        originalDevices.symmetricDifference(self.selected).size > 0 ||
        originalDecals.symmetricDifference(self.selectedDecals).size > 0
      ) {
        self.selected = new Set(self.selected);
        self.selectedDecals = new Set(self.selectedDecals);
        ctx.updateTool();
      }
    },
  };
}

export function splitArgs(cmd: string) {
  const args = cmd.split(" ").filter((it) => it);
  if (cmd.endsWith(" ")) args.push("");
  return args;
}

// NOTE: oldCmds is expected to be consistent and is appended to
function TerminalEmulator<State extends InternalState>(
  inputBar: string,
  setInputBar: (s: string) => void,
  content: string,
  oldCmds: string[],
): DevicePanel<State> {
  return function TerminalEmulator(ctx: EmulatorContext<State>) {
    const setInput = (s: string) => {
      if (!s.endsWith("?")) {
        setInputBar(s);
        return;
      }
      const lastArg = getAutoComplete({ ...ctx, args: splitArgs(inputBar) });
      if (lastArg) {
        const args = splitArgs(s);
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
          className="w-full"
          value={content}
          rows={8}
          readOnly
        />
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            ctx.write("> " + inputBar);
            runOnInterpreter({
              args: splitArgs(inputBar),
              ...ctx,
            });
            oldCmds.push(inputBar);
            setInput("");
          }}
        >
          <input
            type="text"
            value={inputBar}
            placeholder=">"
            className="w-full bg-zinc-700 p-1"
            onKeyDown={(ev) => {
              switch (ev.key) {
                case "Tab":
                  ev.preventDefault();
                  const args = splitArgs(inputBar);
                  const lastArg = getAutoComplete({
                    ...ctx,
                    args,
                  });
                  if (lastArg) {
                    args[args.length - 1] = lastArg;
                    setInput(args.join(" "));
                  }
                  break;
                case "ArrowUp":
                  ev.preventDefault();
                  if (inputBar == "") {
                    setInput(oldCmds.at(-1) ?? "");
                  } else {
                    const previousCmd =
                      oldCmds.findLastIndex((it) => it == inputBar) - 1;
                    if (previousCmd >= 0) setInput(oldCmds[previousCmd]);
                  }
                  break;
                case "ArrowDown":
                  ev.preventDefault();
                  const nextCmd =
                    oldCmds.findLastIndex((it) => it == inputBar) + 1;
                  setInput(oldCmds.at(nextCmd) ?? "");
                  break;
              }
            }}
            onChange={(ev) => setInput(ev.target.value)}
          />
        </form>
      </div>
    );
  };
}

// Must update tool and project after call
function duplicateSelection(self: SelectTool, project: ProjectManager) {
  const newSelected = new Array<number>();
  const oldSelected = [...self.selected];
  for (const s of oldSelected) {
    const newId = project.duplicateDevice(s)!;
    newSelected.push(newId);
    project.mutDevice(newId)!.pos[0] += 10;
    project.mutDevice(newId)!.pos[1] += 10;
  }

  // Copy device connections
  // NOTE: Set iteration is guaranteed to be in insertion ordedr
  // https://tc39.es/ecma262/multipage/keyed-collections.html#sec-set.prototype.foreach
  for (const [idx, dev] of [...self.selected].entries()) {
    const connections = project.getAllConnectedTo(dev);
    for (const pair of connections) {
      if (deviceOfIntf(pair[1]) == dev) pair.reverse();

      const otherDev = deviceOfIntf(pair[1]);
      if (!self.selected.has(otherDev)) continue;

      const otherIdx = oldSelected.findIndex((oldIdx) => oldIdx == otherDev);
      if (otherIdx == -1) continue;

      project.connect(
        newSelected[idx],
        idxOfIntf(pair[0]),
        newSelected[otherIdx],
        idxOfIntf(pair[1]),
      );
    }
  }

  const newDecals = new Set<number>();
  for (const s of self.selectedDecals) {
    const newId = project.duplicateDecal(s)!;
    newDecals.add(newId);
    project.mutDecal(newId)!.pos[0] += 10;
    project.mutDecal(newId)!.pos[1] += 10;
  }
  self.selected = new Set(newSelected);
  self.selectedDecals = newDecals;
}

function Square(props: { size: number; x: number; y: number }) {
  const { size, ...other } = props;
  return (
    <rect
      width={size}
      height={size}
      rx={1}
      ry={1}
      stroke="white"
      fill="none"
      {...other}
    />
  );
}

function Path(props: { d: string }) {
  return (
    <path
      stroke="white"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
      {...props}
    />
  );
}

function VLine({ x, from, to }: { x: number; from: number; to: number }) {
  return (
    <line
      x1={x}
      x2={x}
      y1={from}
      y2={to}
      stroke="white"
      strokeLinecap="round"
    />
  );
}

function SelectionActions({
  duplicate,
  del,
  className,
  children,
}: {
  duplicate: () => void;
  del: () => void;
  className?: string;
  children: ReactNode;
}) {
  const CLASSNAME = "bg-zinc-700 flex-1";
  return (
    <div className={"flex w-full items-center " + (className ?? "")}>
      {children}
      <BtnArray>
        <BtnArrEl className={CLASSNAME} onClick={duplicate}>
          <svg width={20} height={20} viewBox="0 0 10 10">
            <Square size={6} x={1} y={1} />
            <Square size={6} x={3} y={3} />
          </svg>
        </BtnArrEl>
        <BtnArrEl className={CLASSNAME} onClick={del}>
          <svg width={20} height={20} viewBox="0 0 12 12">
            <Path d="M 2.5 1.5 H 6 v -0.5 v 0.5 H 9.5" />
            <VLine x={7} from={4.6} to={9.4} />
            <VLine x={5} from={4.6} to={9.4} />
            <Path d="M 2 3 l 1 1 V 10 q 0,1 1,1 H 8 q 1,0 1,-1 V 4 l 1 -1 z" />
          </svg>
        </BtnArrEl>
      </BtnArray>
    </div>
  );
}
