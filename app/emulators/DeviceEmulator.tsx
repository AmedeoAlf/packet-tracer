import { ReactNode } from "react";
import { Device } from "../devices/Device";
import { ToolCtx } from "../tools/Tool";
import { MacAddress } from "../protocols/802_3";
import { toInterfaceId } from "../ProjectManager";

export interface NetworkInterface {
  type: "serial" | "copper" | "fiber";
  maxMbps: 10 | 100 | 1000 | 10000;
  name: string;
  mac: MacAddress;
}

export type InternalState<Ext extends object> = {
  netInterfaces: Array<NetworkInterface>;
  currShell?: Command<InternalState<object>>;
} & Ext;

interface AutoCompleteOption {
  option: string;
  desc: string;
}
export type Command<State extends InternalState<object>> = (
  | {
      autocomplete: (state: State, past: string[]) => AutoCompleteOption[];
      validate: (state: State, past: string[]) => boolean;
      paramDesc: string;
      then: Command<State>;
    }
  | {
      subcommands: Record<string, SubCommand<State>>;
    }
  | {
      run: (ctx: EmulatorContext<State>) => void;
    }
) & {
  run?: (ctx: EmulatorContext<State>) => void;
};

export type SubCommand<State extends InternalState<object>> = Command<State> & {
  desc: string;
};

export type Interpreter<State extends InternalState<object>> = {
  shell: Command<State>;
};

export type EmulatorContext<State extends InternalState<object>> = {
  interpreter: Interpreter<State>;
  sendOnIf: (ifIdx: number, data: Buffer) => void;
  state: State;
  updateState: () => void;
  args?: string[];
  write: (msg: string) => void;
};

export function runOnInterpreter<State extends InternalState<object>>(
  ctx: EmulatorContext<State>,
) {
  if (!ctx.args) return;
  let cmd = ctx.interpreter.shell;
  ctx.args = ctx.args.filter((it) => it);
  for (const arg of ctx.args.keys()) {
    const err = () =>
      ctx.write(
        `ERROR: Invalid argument in position ${arg} "${ctx.args![arg]}" in command`,
      );
    switch (true) {
      case "subcommands" in cmd && !!cmd.subcommands:
        if (ctx.args[arg] in cmd.subcommands) {
          cmd = cmd.subcommands[ctx.args[arg]];
        } else return err();
        continue;
      case "validate" in cmd:
        if (cmd.validate(ctx.state, ctx.args.slice(0, arg + 1))) {
          cmd = cmd.then;
        } else return err();
        continue;
      case "run" in cmd && !!cmd.run:
        return cmd.run(ctx);
    }
  }
  if ("run" in cmd && cmd.run) cmd.run(ctx);
  else ctx.write(`ERROR: incomplete command`);
}

// last element in ctx.args must be "" to get all autocomplete options
export function getAutoComplete<State extends InternalState<object>>(
  ctx: EmulatorContext<State>,
) {
  if (ctx.args == undefined) return;
  let cmd = ctx.interpreter.shell;

  const writeOrComplete = (opts: AutoCompleteOption[], desc: string = "") => {
    switch (opts.length) {
      case 0:
        if (desc) ctx.write(`<${desc}>`);
        return;
      case 1:
        return opts[0].option + " ";
      default:
        ctx.write(
          (desc ? `<${desc}>\n` : "") +
            opts.map(({ option, desc }) => `${option} - ${desc}`).join("\n"),
        );
        const equalUntil = (a: string, b: string) => {
          if (a.length < b.length) [a, b] = [b, a];
          return [...a].findIndex((chr, i) => chr !== b[i]);
        };
        return (
          opts
            .map((it) => it.option)
            .reduce((acc, val) => acc.slice(0, equalUntil(val, acc))) ||
          undefined
        );
    }
  };

  for (const arg of ctx.args.keys()) {
    const autocompleteIfLast = (opts: AutoCompleteOption[], desc?: string) => {
      if (arg == ctx.args!.length - 1) {
        return writeOrComplete(
          opts.filter(({ option }) => option.startsWith(ctx.args![arg])),
          desc,
        );
      } else {
        ctx.write(
          `ERROR: Invalid argument in position ${arg} "${ctx.args![arg]}" in command`,
        );
      }
    };
    switch (true) {
      case "subcommands" in cmd && !!cmd.subcommands:
        if (ctx.args[arg] in cmd.subcommands) {
          cmd = cmd.subcommands[ctx.args[arg]];
        } else
          return autocompleteIfLast(
            Object.entries(cmd.subcommands!).map(([option, { desc }]) => ({
              option,
              desc,
            })),
          );
        continue;
      case "validate" in cmd:
        const args = ctx.args.slice(0, arg + 1);
        if (args[arg] != "" && cmd.validate(ctx.state, args)) {
          cmd = cmd.then;
        } else
          return autocompleteIfLast(
            cmd.autocomplete(ctx.state, args),
            cmd.paramDesc,
          );
        continue;
      default:
        ctx.write(
          `ERROR: Command finished with ${arg} "${ctx.args![arg]}" in command`,
        );
    }
  }
  return;
}

export type DevicePanel<State extends InternalState<object>> = (
  ctx: EmulatorContext<State>,
) => ReactNode;
export interface DeviceEmulator<State extends InternalState<object>> {
  configPanel: Record<string, DevicePanel<State>>;
  cmdInterpreter: Interpreter<State>;
  packetHandler: (
    ctx: EmulatorContext<State>,
    data: Buffer,
    intf: number,
  ) => void;
}

export function buildEmulatorContext(
  device: Device,
  toolCtx: ToolCtx,
): EmulatorContext<InternalState<any>> {
  const emulator = device.emulator;
  return {
    interpreter: emulator.cmdInterpreter as Interpreter<InternalState<any>>,
    updateState: () => {
      device.internalState = { ...device.internalState };
      toolCtx.project.mutDevice(device.id);
      toolCtx.updateProject();
      toolCtx.update();
    },
    sendOnIf(ifIdx, data) {
      toolCtx.project.sendOn(toInterfaceId(device.id, ifIdx), toolCtx, data);
    },
    state: device.internalState,
    write() {},
  };
}
