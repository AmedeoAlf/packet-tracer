import { CanvasEvent, Tool, ToolCtx } from "./Tool";
import { deviceTypesDB } from "../devices/deviceTypesDB";
import { DevicePanel, EmulatorContext, getAutoComplete, InternalState, runOnInterpreter } from "../emulators/DeviceEmulator";
import { Coords } from "../common";

export type SelectTool = Tool & {
  selected: Set<number>;
  lastCursorPos?: Coords;
  stdout: string;
  stdin: string;
}

export function makeSelectTool(ctx: ToolCtx): SelectTool {
  console.log(ctx)
  return {
    selected: new Set<number>(),
    stdin: "",
    stdout: "= Terminal emulator =",
    ...ctx,
    lastCursorPos: undefined,
    toolname: "select",
    svgElements: () => (<></>),
    panel() {
      switch (this.selected.size) {
        case 0:
          return (
            <p>Seleziona un dispositivo per vedere le proprietà</p>
          );
        case 1:
          const device = this.project.devices[this.selected.values().next().value!!];
          const emulator = deviceTypesDB[device.deviceType].emulator;
          const tool = this;
          const ctx: EmulatorContext<any> = {
            interpreter: emulator.cmdInterpreter,
            updateState() {
              device.internalState = { ...device.internalState };
              tool.updateProject();
            },
            state: device.internalState,
            write(msg) {
              tool.stdout += "\n" + msg;
              tool.update();
            },
          };
          const panels: [string, DevicePanel<any>][] = [
            ["terminal",
              TerminalEmulator(
                tool.stdin,
                (stdin) => { tool.stdin = stdin; tool.update(); },
                tool.stdout
              )],
            ...Object.entries(emulator.configPanel)
          ];
          return (
            <div>
              <h1 className="text-xl font-bold">{device.name}</h1>
              {panels.map(([k, v]) => (
                <div key={k} className="mb-2">
                  <h2 className="text-lg font-bold">{k}</h2> <hr />
                  {v(ctx)}
                </div>
              ))}
            </div>
          );
        default:
          return (
            <p>Non ancora implementato</p>
          );
      }
    },
    onEvent(ev: CanvasEvent): void {
      const originalDevices = new Set(this.selected);
      switch (ev.type) {
        case "click":
          if (ev.device) {
            if (!ev.shiftKey) this.selected.clear();
            this.selected.add(ev.device.id);
          } else {
            this.selected.clear();
          }
          break;
        case "mousedown":
          if (!ev.device) {
            return;
          }
          if (!ev.shiftKey && !this.selected.has(ev.device.id)) {
            this.selected.clear();
          }
          this.selected.add(ev.device.id);
          this.lastCursorPos = this.selected.size != 0 ? ev.pos : undefined;
          break;
        case "mousemove":
          if (this.lastCursorPos) {
            for (const dev of this.selected) {
              this.project.devices[dev].pos.x += ev.pos.x - this.lastCursorPos.x;
              this.project.devices[dev].pos.y += ev.pos.y - this.lastCursorPos.y;
              this.project.devices[dev] = { ...this.project.devices[dev] }
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
                this.project.devices[dev].pos.x += diffX;
                this.project.devices[dev].pos.y += diffY;
              }
              this.updateProject();
            }
            this.lastCursorPos = undefined;
          }
          break;
      }
      if (originalDevices.symmetricDifference(this.selected).size > 0) {
        this.selected = new Set(this.selected);
        this.update();
      }
    },
  }
}


// TODO: separate correctly args
function TerminalEmulator<State extends InternalState<object>>(
  inputBar: string,
  setInputBar: (s: string) => void,
  content: string,
): DevicePanel<State> {
  return (ctx: EmulatorContext<State>) => {
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
    }
    return (
      <div className="font-mono">
        <textarea
          ref={area => { if (area) area.scrollTop = area.scrollHeight }
          }
          value={content}
          rows={8} cols={50}
          readOnly />
        <form onSubmit={(ev) => {
          ev.preventDefault();
          ctx.write("> " + inputBar);
          runOnInterpreter({
            args: inputBar.split(" "),
            ...ctx
          });
          setInput("");
        }
        }>
          <input
            type="text"
            value={inputBar}
            placeholder=">"
            className="w-full bg-gray-700"
            onKeyDown={ev => {
              if (ev.key != "Tab") return;
              ev.preventDefault();
              const lastArg = getAutoComplete({ ...ctx, args: inputBar.split(" ") });
              if (lastArg) {
                const args = inputBar.split(" ");
                args[args.length - 1] = lastArg;
                setInput(args.join(" "));
              }
            }}
            onChange={ev => setInput(ev.target.value)} />
        </form>
      </div >
    )
  }
}
