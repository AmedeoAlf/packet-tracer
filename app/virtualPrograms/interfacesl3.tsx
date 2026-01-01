import { EmulatorContext, SubCommand } from "../emulators/DeviceEmulator";
import {
  ipv4ToString,
  L3InternalStateBase,
  parseIpv4,
} from "../protocols/rfc_760";
import { interfaces } from "./interfaces";

export const interfacesL3 = {
  desc: "Manages interfaces",
  run: interfaces.run,
  subcommands: {
    ...interfaces.subcommands,
    "set-ip": {
      desc: "Sets an interface ip",
      paramDesc: "Interface",
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
        paramDesc: "New ip address",
        autocomplete: () => [],
        validate: (_, past) => parseIpv4(past[3]) !== undefined,
        then: {
          paramDesc: "Subnet mask",
          autocomplete: () => [],
          validate: (_, past) => parseIpv4(past[4]) !== undefined,
          then: {
            run(ctx: EmulatorContext<L3InternalStateBase>) {
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
} satisfies SubCommand<L3InternalStateBase>;
