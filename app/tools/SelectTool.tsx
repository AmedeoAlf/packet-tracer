import { CanvasEvent, Tool, ToolCtx } from "./Tool";
import {
  buildEmulatorContext,
  DevicePanel,
  EmulatorContext,
  getAutoComplete,
  InternalState,
  runOnInterpreter,
} from "../emulators/DeviceEmulator";
import { Coords } from "../common";

export type SelectTool = Tool & {
  selected: Set<number>;
  selectedDecals: Set<number>;
  lastCursorPos?: Coords;
  stdout: string;
  stdin: string;
};

export function makeSelectTool(ctx: ToolCtx): SelectTool {
  return {
    selected: new Set<number>(),
    selectedDecals: new Set<number>(),
    stdin: "",
    stdout: "= Terminal emulator =",
    ...ctx,
    lastCursorPos: undefined,
    toolname: "select",
    svgElements: () => <></>,
    panel() {
      switch (this.selected.size + this.selectedDecals.size) {
        case 0:
          return <p>Seleziona un dispositivo per vedere le proprietà</p>;
        case 1:
          if (this.selected.size === 1) {
            const device = this.project.immutableDevices.get(
              this.selected.values().next().value!,
            )!;
            const emulator = device.emulator;
            const ctx = buildEmulatorContext(device, this);
            // ctx.write = (msg) => {
            //   this.stdout += "\n" + msg;
            //   this.update();
            // };

            const panels: [string, DevicePanel<any>][] = [
              [
                "terminal",
                TerminalEmulator(
                  this.stdin,
                  (stdin) => {
                    this.stdin = stdin;
                    this.update();
                  },
                  this.stdout,
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
                    ctx.updateState();
                  }}
                />{" "}
                ✏️
                {panels.map(([k, v]) => (
                  <div key={k} className="mb-2">
                    <h2 className="text-lg font-bold">{k}</h2> <hr />
                    {v(ctx)}
                  </div>
                ))}
              </div>
            );
          } else {
            const decal = this.selectedDecals.values().next().value!;
            const offsetSelection = (of: number) => () => {
              this.selectedDecals = new Set([
                this.project.moveDecalIdx(decal, of),
              ]);
              console.log(decal, this.selectedDecals.values().next().value);
              this.updateProject();
              this.update();
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
    onEvent(ev: CanvasEvent): void {
      const originalDevices = new Set(this.selected);
      const originalDecals = new Set(this.selectedDecals);
      switch (ev.type) {
        case "mousedown":
          if (ev.device) {
            if (!ev.shiftKey && !this.selected.has(ev.device.id)) {
              this.selected.clear();
              this.selectedDecals.clear();
            }
            this.selected.add(ev.device.id);
            this.lastCursorPos = ev.pos;
          } else if (ev.decal) {
            if (!ev.shiftKey && !this.selectedDecals.has(ev.decal.id)) {
              this.selected.clear();
              this.selectedDecals.clear();
            }
            this.selectedDecals.add(ev.decal.id);
            this.lastCursorPos = ev.pos;
          } else {
            this.selected.clear();
            this.selectedDecals.clear();
          }
          break;
        case "mousemove":
          if (this.lastCursorPos) {
            for (const dev of this.selected) {
              this.project.mutDevice(dev)!.pos.x +=
                ev.pos.x - this.lastCursorPos.x;
              this.project.mutDevice(dev)!.pos.y +=
                ev.pos.y - this.lastCursorPos.y;
            }
            for (const dec of this.selectedDecals) {
              this.project.mutDecal(dec)!.pos.x +=
                ev.pos.x - this.lastCursorPos.x;
              this.project.mutDecal(dec)!.pos.y +=
                ev.pos.y - this.lastCursorPos.y;
            }
            this.updateProject();
            this.lastCursorPos = ev.pos;
          }
          break;
        case "mouseup":
          if (this.lastCursorPos) {
            const diffX = ev.pos.x - this.lastCursorPos.x;
            const diffY = ev.pos.y - this.lastCursorPos.y;
            if (diffX || diffY) {
              for (const dev of this.selected) {
                this.project.mutDevice(dev)!.pos.x += diffX;
                this.project.mutDevice(dev)!.pos.y += diffY;
              }
              for (const dec of this.selectedDecals) {
                this.project.mutDecal(dec)!.pos.x += diffX;
                this.project.mutDecal(dec)!.pos.y += diffY;
              }
              this.updateProject();
            }
            this.lastCursorPos = undefined;
          }
          break;
        case "keydown":
          ev.consumed = true;
          switch (ev.key) {
            case "Delete": {
              for (const s of this.selected) {
                this.project.deleteDevice(s);
              }
              for (const s of this.selectedDecals) {
                this.project.removeDecal(s);
              }
              this.selected.clear();
              this.selectedDecals.clear();
              this.update();
              this.updateProject();
              return;
            }
            case "d": {
              const newSelected = new Set<number>();
              for (const s of this.selected) {
                const newId = this.project.duplicateDevice(s)!;
                newSelected.add(newId);
                this.project.mutDevice(newId)!.pos.x += 10;
                this.project.mutDevice(newId)!.pos.y += 10;
              }
              const newDecals = new Set<number>();
              for (const s of this.selectedDecals) {
                const newId = this.project.duplicateDecal(s)!;
                newDecals.add(newId);
                this.project.mutDecal(newId)!.pos.x += 10;
                this.project.mutDecal(newId)!.pos.y += 10;
              }
              this.selected = newSelected;
              this.selectedDecals = newDecals;
              this.update();
              this.updateProject();
              return;
            }
            default:
              ev.consumed = false;
          }
      }
      if (
        originalDevices.symmetricDifference(this.selected).size > 0 ||
        originalDecals.symmetricDifference(this.selectedDecals).size > 0
      ) {
        this.selected = new Set(this.selected);
        this.selectedDecals = new Set(this.selectedDecals);
        this.update();
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
