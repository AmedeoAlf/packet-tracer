import { pluralize } from "@/app/common";
import { DropDown } from "@/app/editorComponents/reusable/DropDown";
import { TextInput } from "@/app/editorComponents/reusable/TextInput";
import {
  buildEmulatorContext,
  DevicePanel,
  EmulatorContext,
  getAutoComplete,
  InternalState,
  runOnInterpreter,
} from "@/app/emulators/DeviceEmulator";
import { SelectTool } from "../SelectTool";
import { ToolCtx } from "../Tool";
import duplicateSelection from "./duplicateSelection";
import SelectionActions from "./SelectionActions";

export default function SelectToolPanel(ctx: ToolCtx<SelectTool>) {
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const panels: Record<string, DevicePanel<InternalState<any>>> = {
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
                duplicateSelection(ctx.toolRef.current, ctx.projectRef.current);
                ctx.updateTool();
                ctx.updateProject(true);
              }}
              del={() => {
                ctx.projectRef.current.deleteDevice(device.id);
                ctx.toolRef.current.selected.clear();
                ctx.updateTool();
                ctx.updateProject(true);
              }}
            >
              <p className="flex-1">1 dispositivo selezionato</p>
            </SelectionActions>
            <TextInput
              value={device.name}
              setValue={(name) => {
                device.name = name;
                emuCtx.updateState();
              }}
            />
            <DropDown
              open={ctx.toolRef.current.selectingDevicePanel}
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
        const decal = ctx.toolRef.current.selectedDecals.values().next().value!;
        const offsetSelection = (of: number) => () => {
          const newIdx = ctx.projectRef.current.moveDecalIdx(decal, of);
          if (newIdx != -1) {
            ctx.toolRef.current.selectedDecals = new Set([newIdx]);
            ctx.updateProject(true);
            ctx.updateTool();
          }
        };
        return (
          <div>
            <SelectionActions
              duplicate={() => {
                duplicateSelection(ctx.toolRef.current, ctx.projectRef.current);
                ctx.updateTool();
                ctx.updateProject(true);
              }}
              del={() => {
                ctx.projectRef.current.removeDecal(decal);
                ctx.toolRef.current.selectedDecals.clear();
                ctx.updateTool();
                ctx.updateProject(true);
              }}
            >
              <p className="flex-1">1 decal selezionato</p>
            </SelectionActions>
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
      const devicesStr = pluralize(
        ctx.tool.selected.size,
        "dispositivo",
        "dispositivi",
      );

      const decalsStr = pluralize(
        ctx.tool.selectedDecals.size,
        "decal",
        "decals",
      );

      const infoStr =
        devicesStr && decalsStr
          ? `${devicesStr} e ${decalsStr} selezionati`
          : `${devicesStr ?? decalsStr} selezionati`;

      return (
        <SelectionActions
          duplicate={() => {
            duplicateSelection(ctx.toolRef.current, ctx.projectRef.current);
            ctx.updateTool();
            ctx.updateProject(true);
          }}
          del={() => {
            for (const id of ctx.toolRef.current.selected)
              ctx.projectRef.current.deleteDevice(id);
            ctx.toolRef.current.selected.clear();
            ctx.updateTool();
            ctx.updateProject(true);
          }}
        >
          <p className="flex-1">{infoStr}</p>
        </SelectionActions>
      );
  }
}

function splitArgs(cmd: string) {
  if (cmd == "") return [""];
  const args = cmd.split(" ").filter((it) => it);
  if (cmd.endsWith(" ")) args.push("");
  return args;
}

// NOTE: oldCmds is expected to be consistent and is appended to
function TerminalEmulator<State extends InternalState<State>>(
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
          className="w-full bg-onsidebar p-2"
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
            className="w-full bg-ontopbar p-1"
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
