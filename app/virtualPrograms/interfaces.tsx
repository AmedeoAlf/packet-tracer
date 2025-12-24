import {
  SubCommand,
  InternalState,
  EmulatorContext,
} from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";

export const interfaces = {
  desc: "Manages interfaces",
  run: (ctx: EmulatorContext<InternalState<object>>) =>
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
      validate: (state, args) => {
        return state.netInterfaces.some((it) => it.name == args[2]);
      },
      desc: "Renames an interface",
      paramDesc: "Interface",
      then: {
        paramDesc: "New name",
        autocomplete: () => [],
        validate: () => true,
        then: {
          run(ctx: EmulatorContext<InternalState<object>>) {
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
} satisfies SubCommand<InternalState<object>>;
