import { ReactNode } from "react";

export type InternalState<Ext extends object> = {
  netInterfaces: Array<string>;
} & Ext;

type AutoCompleteOption = { option: string, desc: string }
export type Command<State extends InternalState<object>> = ({
  autocomplete: (state: State, past: string[]) => AutoCompleteOption[],
  validate: (state: State, past: string[]) => boolean,
  then: Command<State>
} | {
  subcommands?: Record<string, Command<State>>
  run?: (ctx: EmulatorContext<State>) => void
}) & {
  desc: string
}

export type Interpreter<State extends InternalState<object>> = {
  shell: Command<State>,
}

export type EmulatorContext<State extends InternalState<object>> = {
  interpreter: Interpreter<State>,
  state: State,
  updateState: () => void,
  args?: string[],
  write: (msg: string) => void
}

export function runOnInterpreter<State extends InternalState<object>>(ctx: EmulatorContext<State>) {
  if (!ctx.args) return;
  let cmd = ctx.interpreter.shell;
  for (const arg of ctx.args.keys()) {
    const err = () => ctx.write(`ERROR: Invalid argument in position ${arg} "${ctx.args!![arg]}" in command`)
    switch (true) {
      case ("subcommands" in cmd && !!cmd.subcommands):
        if (ctx.args[arg] in cmd.subcommands) {
          cmd = cmd.subcommands[ctx.args[arg]];
        } else return err();
        continue;
      case ("validate" in cmd):
        if (cmd.validate(ctx.state, ctx.args.slice(0, arg + 1))) {
          cmd = cmd.then;
        } else return err();
        continue;
      case ("run" in cmd && !!cmd.run):
        return cmd.run(ctx);
    }
  }
  if ("run" in cmd && cmd.run)
    cmd.run(ctx);
  else
    ctx.write(`ERROR: incomplete command, missing: ${cmd.desc}`);
}

// last element in ctx.args must be "" to get all options
export function getAutoComplete<State extends InternalState<object>>(ctx: EmulatorContext<State>) {
  if (ctx.args == undefined) return;
  let cmd = ctx.interpreter.shell;

  const writeOrComplete = (opts: AutoCompleteOption[]) => {
    switch (opts.length) {
      case 0:
        return;
      case 1: return opts[0].option + " ";
      default:
        ctx.write(opts.map(({ option, desc }) => `${option} - ${desc}`).join("\n"))
        const equalUntil = (a: string, b: string) => {
          if (a.length < b.length) [a, b] = [b, a];
          return [...a].findIndex((chr, i) => chr !== b[i]);
        }
        return opts
          .map(it => it.option)
          .reduce((acc, val) => acc.slice(0, equalUntil(val, acc))) || undefined;
    }
  }

  for (const arg of ctx.args.keys()) {
    const autocompleteIfLast = (opts: AutoCompleteOption[]) => {
      if (arg == ctx.args!!.length - 1) {
        return writeOrComplete(opts.filter(({ option }) => option.startsWith(ctx.args!![arg])))
      } else {
        ctx.write(`ERROR: Invalid argument in position ${arg} "${ctx.args!![arg]}" in command`)
      }
    }
    switch (true) {
      case ("subcommands" in cmd && !!cmd.subcommands):
        if (ctx.args[arg] in cmd.subcommands) {
          cmd = cmd.subcommands[ctx.args[arg]];
        } else return autocompleteIfLast(
          Object.entries(cmd.subcommands!!).map(
            ([option, { desc }]) => ({ option, desc })
          )
        );
        continue;
      case ("validate" in cmd):
        const args = ctx.args.slice(0, arg + 1);
        if (cmd.validate(ctx.state, args)) {
          cmd = cmd.then;
        } else return autocompleteIfLast(
          cmd.autocomplete(ctx.state, args)
        );
        continue;
      default:
        ctx.write(`ERROR: Command finished with ${arg} "${ctx.args!![arg]}" in command`)
    }
  }
  return;
}

export type DevicePanel<State extends InternalState<object>> = (ctx: EmulatorContext<State>) => ReactNode
export interface DeviceEmulator<State extends InternalState<object>> {
  configPanel: Record<
    string,
    DevicePanel<State>
  >;
  cmdInterpreter: Interpreter<State>;
}


