"use client";
import { Tool, ToolCtx } from "./Tool";
import { deviceTypesDB } from "../devices/deviceTypesDB";
import { DevicePanel, EmulatorContext, getAutoComplete, InternalState, runOnInterpreter } from "../emulators/DeviceEmulator";
import { Coords } from "../common";

export type SelectToolCtx = ToolCtx & {
  selected: Set<number>;
  lastCursorPos?: Coords;
  stdout: string;
  stdin: string;
}

export const SelectTool: Tool = {
  toolname: "select",
  panel: (context: ToolCtx) => {
    const toolctx = context as SelectToolCtx;
    switch (toolctx.selected.size) {
      case 0:
        return (
          <p>Seleziona un dispositivo per vedere le proprietà</p>
        );
      case 1:
        const device = toolctx.project.devices[toolctx.selected.values().next().value!!];
        const emulator = deviceTypesDB[device.deviceType].emulator;
        const ctx: EmulatorContext<any> = {
          interpreter: emulator.cmdInterpreter,
          updateState() {
            device.internalState = { ...device.internalState };
            toolctx.updateProject();
          },
          state: device.internalState,
          write(msg) {
            toolctx.stdout += "\n" + msg;
            toolctx.update();
          },
        };
        const panels: [string, DevicePanel<any>][] = [
          ["terminal",
            TerminalEmulator(
              toolctx.stdin,
              (stdin) => { toolctx.stdin = stdin; toolctx.update(); },
              toolctx.stdout
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
  onEvent(ctx, ev): void {
    const toolctx = ctx as SelectToolCtx;
    switch (ev.type) {
      case "click":
        if (ev.device) {
          if (!ev.shiftKey) toolctx.selected.clear();
          toolctx.selected.add(ev.device.id);
        } else {
          toolctx.selected.clear();
        }
        toolctx.update();
        break;
      case "mousedown":
        if (!ev.device) {
          toolctx.selected.clear();
          toolctx.update();
          return;
        }
        if (!ev.shiftKey && !toolctx.selected.has(ev.device.id)) {
          toolctx.selected.clear();
        }
        toolctx.selected.add(ev.device.id);
        toolctx.lastCursorPos = toolctx.selected.size != 0 ? ev.pos : undefined;
        toolctx.update();
        break;
      case "mousemove":
        if (toolctx.lastCursorPos) {
          for (const dev of toolctx.selected) {
            toolctx.project.devices[dev].pos.x += ev.pos.x - toolctx.lastCursorPos.x;
            toolctx.project.devices[dev].pos.y += ev.pos.y - toolctx.lastCursorPos.y;
          }
          toolctx.updateProject();
          toolctx.lastCursorPos = ev.pos;
          toolctx.update();
        }
        break;
      case "mouseup":
        if (toolctx.lastCursorPos) {
          for (const dev of toolctx.selected) {
            toolctx.project.devices[dev].pos.x += ev.pos.x - toolctx.lastCursorPos.x;
            toolctx.project.devices[dev].pos.y += ev.pos.y - toolctx.lastCursorPos.y;
          }
        }
        toolctx.updateProject();
        toolctx.lastCursorPos = undefined;
        toolctx.update();
        break;
    }
  },
  make: (context) => {
    const ctx = context as SelectToolCtx;
    SelectTool.ctx = ctx;
    ctx.selected ||= new Set<number>();
    ctx.stdin ||= "";
    ctx.stdout ||= "= Terminal emulator =";
    return SelectTool;
  },
  svgElements: () => (<></>)
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
