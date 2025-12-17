import { Command } from "../emulators/DeviceEmulator";
import { ipv4ToString, L3InternalState, parseIpv4 } from "../protocols/rfc_760";
import { interfaces } from "./interfaces";

export function interfacesL3<T extends L3InternalState<object>>() {
  return {
    desc: "Manages interfaces",
    run: interfaces<T>().run,
    subcommands: {
      ...interfaces().subcommands,
      "set-ip": {
        desc: "Sets an interface ip",
        autocomplete: (state) =>
          state.netInterfaces.map((it, idx) => {
            const ipv4 = state.l3Ifs.at(idx)?.ip;
            return {
              desc: `${it.type} ${it.maxMbps} Mbps ${ipv4 ? ipv4ToString(ipv4) : "No ip"}`,
              option: it.name,
            };
          }),
        validate(state, args) {
          return state.netInterfaces.some((it) => it.name == args[2]);
        },
        then: {
          desc: "New ip address",
          autocomplete: () => [],
          validate: (_, past) => parseIpv4(past[3]) !== undefined,
          then: {
            desc: "Subnet mask",
            autocomplete: () => [],
            validate: (_, past) => parseIpv4(past[4]) !== undefined,
            then: {
              desc: "",
              run(ctx) {
                const intfId = ctx.state.netInterfaces.findIndex(
                  (it) => it.name == ctx.args![2],
                );
                const ip = parseIpv4(ctx.args![3])!;
                const mask = parseIpv4(ctx.args![4])!;
                ctx.state.l3Ifs[intfId] = { ip: ip, mask: mask };
                ctx.updateState();
              },
            },
          },
        },
      },
    },
  } satisfies Command<T>;
}
