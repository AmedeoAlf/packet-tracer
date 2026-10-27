/* eslint-disable react-hooks/immutability */
// TODO: is there really no way to fix all these warnings?
// is it possible that ctx is the wrong kind of parameter to be passed to this component?
import { pluralize } from "@/app/common";
import { DropDown } from "@/app/editorComponents/reusable/DropDown";
import { TextInput } from "@/app/editorComponents/reusable/TextInput";
import {
  buildEmulatorContext,
  DevicePanel,
  InternalState,
} from "@/app/emulators/DeviceEmulator";
import { SelectTool } from "../SelectTool";
import { ToolCtx } from "../Tool";
import duplicateSelection from "./duplicateSelection";
import SelectionActions from "./SelectionActions";
import TerminalEmulator from "@/app/editorComponents/Terminal";

export default function SelectToolPanel(ctx: ToolCtx<SelectTool>) {
  switch (ctx.tool.selected.size + ctx.tool.selectedDecals.size) {
    case 0:
      return;
    case 1:
      if (ctx.tool.selected.size === 1) {
        const device = ctx.projectRef.current.devices.asImmutable.get(
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
            ctx.tool.terminalState,
            (state) => {
              ctx.toolRef.current.terminalState = state;
              ctx.updateTool();
            },
            ctx.tool.stdout,
            device.name,
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
                ctx.projectRef.current.devices.delete(device.id);
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
          const newIdx = ctx.projectRef.current.decal.moveIdx(decal, of);
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
                ctx.projectRef.current.decal.delete(decal);
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
              ctx.projectRef.current.devices.delete(id);
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
