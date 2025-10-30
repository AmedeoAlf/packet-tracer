import { ReactNode } from "react";

export type InternalState<Ext> = {
  netInterfaces: Array<string>;
} & Ext;

type AutoCompleteOption = { option: string, desc: string }
type Command<State> = ({
  autocomplete: (state: State, past: string[]) => AutoCompleteOption[],
  validate: (state: State, past: string[]) => boolean,
  then: Command<State>
} | {
  subcommands?: Record<string, Command<State>>
  run?: (ctx: EmulatorContext<State>) => void
}) & {
  desc: string
}

export type Interpreter<State> = {
  shell: Command<State>,
}

export type EmulatorContext<State> = {
  interpreter: Interpreter<State>,
  state: State,
  setState: (s: State) => void,
  args?: string[],
  write: (msg: string) => void
}

export function runOnInterpreter<State>(ctx: EmulatorContext<State>) {
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
    ctx.write("ERROR: incomplete command");
}

// last element in ctx.args must be "" to get all options
export function getAutoComplete<State>(ctx: EmulatorContext<State>) {
  if (ctx.args == undefined) return;
  let cmd = ctx.interpreter.shell;

  const writeOrComplete = (opts: AutoCompleteOption[]) => {
    switch (opts.length) {
      case 0: return;
      case 1: return opts[0].option;
      default: ctx.write(opts.map(({ option, desc }) => `${option} - ${desc}`).join("\n"))
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
        console.log("got subcommands")
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

export type DevicePanel<InternalState> = (ctx: EmulatorContext<InternalState>) => ReactNode
export interface DeviceEmulator<InternalState> {
  configPanel: Record<
    string,
    DevicePanel<InternalState>
  >;
  cmdInterpreter: Interpreter<InternalState>;
}

export const routerEmulator: DeviceEmulator<InternalState<{}>> = {
  configPanel: {
    interfacce(ctx) {
      return (
        <ul>
          {ctx.state.netInterfaces.map((val, idx) => <li key={idx}>{val}</li>)}
        </ul>
      );
    },
  },
  cmdInterpreter: {
    shell: {
      desc: "",
      subcommands: {
        hello: {
          desc: 'Prints "Hello, World!"',
          run: ctx => ctx.write("Hello, World!")
        },
        interfaces: {
          desc: 'Prints all interfaces',
          run: ctx => ctx.write(ctx.state.netInterfaces.join("\n"))
        }
      }
    }
  }
};
