import { ReactNode } from "react";
import { Device } from "../devices/Device";
import { AnyTool, ToolCtx } from "../tools/Tool";
import { MacAddress } from "../protocols/802_3";
import { toInterfaceId } from "../ProjectManager";
import { isSelectTool } from "../tools/SelectTool";

export interface NetworkInterface {
  type: "serial" | "copper" | "fiber";
  maxMbps: 10 | 100 | 1000 | 10000;
  name: string;
  mac: MacAddress;
}

export interface InternalState<TSelf extends InternalState<TSelf>> {
  netInterfaces: Array<NetworkInterface>;
  currShell?: Command<TSelf>;
}

interface AutoCompleteOption {
  option: string;
  desc: string;
}
export type Command<State extends InternalState<State>> =
  | {
      autocomplete: (state: State, past: string[]) => AutoCompleteOption[];
      validate: (state: State, past: string[]) => boolean;
      paramDesc: string;
      then: Command<State>;
      run?: (ctx: EmulatorContext<State>) => void;
    }
  | {
      subcommands: Record<string, SubCommand<State>>;
      run?: (ctx: EmulatorContext<State>) => void;
    }
  | {
      run: (ctx: EmulatorContext<State>) => void;
      done: true;
    };

export type SubCommand<State extends InternalState<State>> = Command<State> & {
  desc: string;
};

export type Interpreter<State extends InternalState<State>> = {
  shell: Command<State>;
};

export type EmulatorContext<State extends InternalState<State>> = {
  interpreter: Interpreter<State>;
  currTick: () => number;
  sendOnIf: (ifIdx: number, data: Buffer) => void;
  schedule: (
    after: number,
    fn: (ctx: EmulatorContext<State>) => void,
  ) => object;
  cancelSchedule: (schedule: object) => void;
  state: State;
  updateState: () => void;
  args?: string[];
  write: (msg: string) => void;
};

export function runOnInterpreter<State extends InternalState<State>>(
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
  else if ("done" in cmd) cmd.run(ctx);
  else ctx.write(`ERROR: incomplete command`);
}

// last element in ctx.args must be "" to get all autocomplete options
export function getAutoComplete<State extends InternalState<State>>(
  ctx: EmulatorContext<State>,
) {
  if (ctx.args == undefined) return;
  let cmd = ctx.interpreter.shell;

  const writeOrComplete = (
    written: string,
    opts: AutoCompleteOption[],
    desc: string = "",
  ) => {
    opts = opts.filter(({ option }) => option.startsWith(written));
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
    const fail = () =>
      ctx.write(
        `ERROR: Invalid argument in position ${arg} "${ctx.args![arg]}" in command`,
      );

    const isLastArg = arg == ctx.args!.length - 1;
    switch (true) {
      case "subcommands" in cmd && !!cmd.subcommands:
        if (ctx.args[arg] in cmd.subcommands) {
          cmd = cmd.subcommands[ctx.args[arg]];
          continue;
        }
        return isLastArg
          ? writeOrComplete(
              ctx.args![arg],
              Object.entries(cmd.subcommands)
                .filter(([name]) => name.startsWith(ctx.args![arg]))
                .map(([name, cmd]) => ({ option: name, desc: cmd.desc })),
            )
          : fail();
      case "autocomplete" in cmd:
        const args = ctx.args.slice(0, arg + 1);
        if (isLastArg)
          return writeOrComplete(
            ctx.args![arg],
            cmd.autocomplete(ctx.state, args),
            cmd.paramDesc,
          );

        if (!cmd.validate(ctx.state, args)) return fail();
        cmd = cmd.then;
        break;
      default:
        ctx.write(
          `ERROR: Command finished with ${arg} "${ctx.args![arg]}" in command`,
        );
        return;
    }
  }
  return;
}

export type DevicePanel<State extends InternalState<State>> = (
  ctx: EmulatorContext<State>,
) => ReactNode;

export interface DeviceEmulator<State extends InternalState<State>> {
  configPanel: { [k: string]: DevicePanel<State> };
  cmdInterpreter: Interpreter<State>;
  packetHandler: (
    ctx: EmulatorContext<State>,
    data: Buffer,
    intf: number,
  ) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEmulatorContext = EmulatorContext<InternalState<any>>;

export function buildEmulatorContext(
  device: Device,
  toolCtx: ToolCtx<AnyTool>,
): AnyEmulatorContext {
  const emulator = device.emulator;
  const tool = toolCtx.toolRef.current;
  return {
    interpreter: emulator.cmdInterpreter,
    updateState: () => {
      device.internalState = { ...device.internalState };
      toolCtx.projectRef.current.mutDevice(device.id);
      toolCtx.updateProject();
      toolCtx.updateTool();
    },
    sendOnIf(ifIdx, data) {
      toolCtx.projectRef.current.beginSimulation();
      toolCtx.projectRef.current.sendOn(toInterfaceId(device.id, ifIdx), data);
    },
    schedule(after, fn): object {
      toolCtx.projectRef.current.beginSimulation();
      return toolCtx.projectRef.current.setTimeout(fn, device, after);
    },
    cancelSchedule(schedule: object) {
      return toolCtx.projectRef.current.removeTimeout(schedule);
    },
    state: device.internalState,
    // NOTE: il print avviene anche con il terminale connesso ad un dispositivo diverso
    write: isSelectTool(tool)
      ? (msg) => {
          tool.stdout += "\n" + msg;
          toolCtx.updateTool();
        }
      : (msg) => {
          console.log("Impossibile scrivere sul terminale", msg);
        },
    currTick: () => {
      toolCtx.projectRef.current.beginSimulation();
      return toolCtx.projectRef.current.currTick;
    },
  };
}
