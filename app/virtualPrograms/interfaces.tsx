import { Command, InternalState } from "../emulators/DeviceEmulator";

export function interfaces<T extends InternalState<object>>(){
  return {
    desc: 'Manages interfaces',
    run: ctx => ctx.write(ctx.state.netInterfaces.join("\n")),
    subcommands: {
      rename: {
        autocomplete: (state, _args) => state.netInterfaces.map(it => { return { desc: `${it.type} ${it.maxMbps} Mbps`, option: it.name } }),
        validate(state, args) {
          return state.netInterfaces.some(it => it.name == args[2])
        },
        desc: "Renames an interface",
        then: {
          desc: "New name",
          autocomplete: () => [],
          validate: () => true,
          then: {
            desc: "Finished",
            run(ctx) {
              const [_1, _2, currName, newName] = ctx.args!!;
              const intf = ctx.state.netInterfaces.find(it => it.name == currName);
              if (intf) intf.name = newName
              ctx.updateState();
            },
          }
        }
      }
    }
  } satisfies Command<T>;
}
