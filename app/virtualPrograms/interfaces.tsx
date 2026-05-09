import { SubCommand, InternalState } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";

export const interfaces = <State extends InternalState<State>>(
  stringifyIntf: (state: State, idx: number) => string = l2StringifyIntf,
  extraSubCommands?: Record<string, SubCommand<State>>,
): SubCommand<State> => ({
  desc: "Manages interfaces",
  run: (ctx) =>
    ctx.write(
      ctx.state.netInterfaces
        .map((_, idx) => stringifyIntf(ctx.state, idx))
        .join("\n"),
    ),
  subcommands: {
    ...extraSubCommands,
    rename: {
      autocomplete: (state) =>
        state.netInterfaces.map((it) => ({
          desc: `${it.type} ${it.maxMbps} Mbps`,
          option: it.name,
        })),
      validate: (state, args) =>
        state.netInterfaces.some((it) => it.name == args[2]),
      desc: "Renames an interface",
      paramDesc: "Interface",
      then: {
        paramDesc: "New name",
        autocomplete: () => [],
        validate: () => true,
        then: {
          run(ctx) {
            const [, , currName, newName] = ctx.args!;
            const intf = ctx.state.netInterfaces.find(
              (it) => it.name == currName,
            );
            if (intf) intf.name = newName;
            ctx.updateState();
          },
          done: true,
        },
      },
    },
  },
});

export function l2StringifyIntf<State extends InternalState<State>>(
  state: State,
  idx: number,
): string {
  const it = state.netInterfaces[idx];
  return `${it.name} ${it.type} ${it.maxMbps}Mbps ${MACToString(it.mac)}`;
}
