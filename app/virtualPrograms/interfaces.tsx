import { Command, InternalState } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";

export function interfaces<T extends InternalState<object>>() {
  return {
    desc: "Manages interfaces",
    run: (ctx) =>
      ctx.write(
        ctx.state.netInterfaces
          .map(
            (it) =>
              `${it.name} ${it.type} ${it.maxMbps}Mbps ${MACToString(it.mac)}`,
          )
          .join("\n"),
      ),
    subcommands: {
      rename: {
        autocomplete: (state) =>
          state.netInterfaces.map((it) => {
            return { desc: `${it.type} ${it.maxMbps} Mbps`, option: it.name };
          }),
        validate(state, args) {
          return state.netInterfaces.some((it) => it.name == args[2]);
        },
        desc: "Renames an interface",
        then: {
          desc: "New name",
          autocomplete: () => [],
          validate: () => true,
          then: {
            desc: "Finished",
            run(ctx) {
              const [, , currName, newName] = ctx.args!;
              const intf = ctx.state.netInterfaces.find(
                (it) => it.name == currName,
              );
              if (intf) intf.name = newName;
              ctx.updateState();
            },
          },
        },
      },
    },
  } satisfies Command<T>;
}
