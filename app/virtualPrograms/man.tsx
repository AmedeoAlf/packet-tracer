import { throwString } from "../common";
import {
  Command,
  InternalState,
  SubCommand,
} from "../emulators/DeviceEmulator";

export default function autoMan<State extends InternalState<State>>(
  shell: Command<State>,
) {
  if (!("subcommands" in shell))
    throwString("Can't apply autoMan to a shell without subcommands");
  shell.subcommands.man = man(shell);
  return shell;
}

export const man = <State extends InternalState<State>>(
  shell: Command<State>,
): SubCommand<State> => {
  if (!("subcommands" in shell)) throwString("man should be passed the shell");
  return {
    desc: "Documents the usage of a command",
    autocomplete: () =>
      Object.entries(shell.subcommands).map(([option, { desc }]) => ({
        option,
        desc,
      })),
    validate: (_, past) => past[1] in shell.subcommands,
    paramDesc: "Command to inspect",
    then: {
      done: true,
      run(ctx) {
        const cmdName = ctx.args![1];
        const cmd =
          shell.subcommands[cmdName] ??
          throwString("How did I get an invalid cmd?");
        ctx.write(`NAME:\n  ${cmdName} - ${cmd.desc}\n`);

        ctx.write("SYNOPSIS:");
        traverse((s) => ctx.write(`  ${cmdName} ${s}`), cmd);
      },
    },
  };
};

function traverse<State extends InternalState<State>>(
  write: (msg: string) => void,
  cmd: Command<State>,
) {
  if (cmd.run) {
    write("");
  }
  if ("subcommands" in cmd) {
    for (const subcmdName in cmd.subcommands) {
      const subcmd = cmd.subcommands[subcmdName];
      traverse((s) => write(`${subcmdName} (${subcmd.desc}) ${s}`), subcmd);
    }
  } else if ("autocomplete" in cmd) {
    traverse((s) => write(`<${cmd.paramDesc}> ${s}`), cmd.then);
  }
}
