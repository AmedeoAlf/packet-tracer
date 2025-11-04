import { Command, InternalState } from "../emulators/DeviceEmulator";

export const interfaces: Command<InternalState<object>> = {
  desc: 'Manages interfaces',
  run: ctx => ctx.write(ctx.state.netInterfaces.join("\n")),
  subcommands: {
    rename: {
      autocomplete: (state, _args) => state.netInterfaces.map(it => { return { desc: "interface", option: it } }),
      validate(state, args) {
        return state.netInterfaces.indexOf(args[2]) != -1
      },
      desc: "Renames an interface",
      then: {
        desc: "<New name>",
        autocomplete: () => [{ option: "<new name>", desc: "The interface's new name" }],
        validate: () => true,
        then: {
          desc: "<New name>",
          run(ctx) {
            const [_1, _2, interf, newName] = ctx.args!!;
            ctx.state.netInterfaces[ctx.state.netInterfaces.indexOf(interf)] = newName;
            ctx.updateState();
          },
        }
      }
    }
  }
}
