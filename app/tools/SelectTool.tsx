"use client";
import { useState } from "react";
import { Project } from "../Project";
import { Tool, CanvasEvent } from "./Tool";
import { deviceTypesDB } from "../devices/Device";
import { DevicePanel, EmulatorContext, getAutoComplete, runOnInterpreter } from "../emulators/DeviceEmulator";
import { Coords } from "../common";


export class SelectTool extends Tool {
  name = "select";
  selected: Set<number>;
  private setSelected: (s: Set<number>) => void;
  lastCursorPos?: Coords;
  panel = () => {
    const [stdout, setStdout] = useState("= Terminal emulator =");
    const [stdin, setStdin] = useState("");
    switch (this.selected.size) {
      case 0:
        return (
          <p>Seleziona un dispositivo per vedere le proprietà</p>
        );
      case 1:
        const device = this.project.devices
          .get(this.selected.values().next().value!!)!!;
        const emulator = deviceTypesDB[device.deviceType].emulator;
        const ctx: EmulatorContext<any> = {
          interpreter: emulator.cmdInterpreter,
          setState: () => { },
          state: device.internalState,
          write: (msg) => setStdout((stdout) => stdout + (msg.startsWith("\n") ? msg : "\n" + msg)),
        }
        const panels: [string, DevicePanel<any>][] = [
          ["terminal", TerminalEmulator<any>(stdin, setStdin, stdout)],
          ...Object.entries(emulator.configPanel)
        ];
        return (
          <div>
            <h1 className="text-xl font-bold">{device.name}</h1>
            {
              panels.map(([k, v]) => (
                <div key={k}>
                  <h2 className="text-lg font-bold">{k}</h2> <hr />
                  {v(ctx)} <hr />
                </div>
              ))}
          </div>
        );
      default:
        return (
          <p>Non ancora implementato</p>
        );
    }
  };
  onEvent(ev: CanvasEvent): void {
    switch (ev.type) {
      case "click":
        if (ev.device) {
          if (!ev.shiftKey) {
            this.setSelected(new Set());
          } else {
            console.log("append", ...this.selected);
          }
          this.setSelected(new Set(this.selected.add(ev.device.id)));
        } else {
          this.setSelected(new Set());
        }
        break;
      case "mousedown":
        if (!ev.device) {
          this.selected.clear();
          return;
        }
        if (!ev.shiftKey && !this.selected.has(ev.device.id)) {
          this.selected.clear();
        }
        this.setSelected(new Set(this.selected.add(ev.device.id)));
        this.lastCursorPos = this.selected.size != 0 ? ev.pos : undefined;
        console.log("Mousedown", ev.pos.x, ev.pos.y, ...this.selected);
        break;
      case "mousemove":
        if (this.lastCursorPos) {
          const translated = new Project(this.project);
          for (const dev of this.selected) {
            translated.devices.get(dev)!!.pos.x += ev.pos.x - this.lastCursorPos.x;
            translated.devices.get(dev)!!.pos.y += ev.pos.y - this.lastCursorPos.y;
          }
          this.setProject(translated);
          this.lastCursorPos = ev.pos;
        }
        break;
      case "mouseup":
        // console.log("Mouseup", ev.pos, this.dragging_from, ev.device);
        if (this.lastCursorPos) {
          const translated = new Project(this.project);
          for (const dev of this.selected) {
            translated.devices.get(dev)!!.pos.x += ev.pos.x - this.lastCursorPos.x;
            translated.devices.get(dev)!!.pos.y += ev.pos.y - this.lastCursorPos.y;
          }
          this.setProject(translated);
        }
        this.lastCursorPos = undefined;
        break;
    }
  }
  constructor(project: Project, setProject: (p: Project) => void) {
    super(project, setProject);
    const t = useState(new Set<number>());
    this.selected = t[0];
    this.setSelected = t[1];
  }
}

// TODO: separate correctly args
function TerminalEmulator<InternalState>(
  inputBar: string,
  setInputBar: (s: string) => void,
  content: string,
): DevicePanel<InternalState> {
  return (ctx: EmulatorContext<InternalState>) => {
    const setInput = (s: string) => {
      if (!s.endsWith("?")) {
        setInputBar(s);
        return;
      }
      const lastArg = getAutoComplete({ ...ctx, args: inputBar.split(" ") });
      if (lastArg) {
        const args = s.split(" ");
        args[args.length - 1] = lastArg;
        setInput(args.join(" "));
      }
    }
    return (
      <div>
        <textarea
          ref={area => { if (area) area.scrollTop = area.scrollHeight }}
          value={content}
          className="font-mono"
          rows={8} cols={50}
          readOnly />
        <form>
          <input
            type="text"
            className="font-mono"
            value={inputBar}
            onChange={ev => setInput(ev.target.value)} />
          <input type="submit" onClick={(ev) => {
            ev.preventDefault();
            ctx.write("> " + inputBar);
            runOnInterpreter({
              args: inputBar.split(" "),
              ...ctx
            });
            setInput("");
          }} />
        </form>
      </div>
    )
  }
}
