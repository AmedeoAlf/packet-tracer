import { EmulatorContext, SubCommand } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";
import {
  ipv4ToString,
  L3InternalState,
  L3InternalStateBase,
  parseIpv4,
} from "../protocols/rfc_760";
import { interfaces } from "./interfaces";

export const interfacesL3 = {
  desc: "Manages interfaces",
  run: (ctx: EmulatorContext<L3InternalState>) =>
    ctx.write(
      ctx.state.netInterfaces
        .map((l2Intf, idx) => {
          const l3Intf = ctx.state.l3Ifs.at(idx);
          const ip = l3Intf
            ? `${ipv4ToString(l3Intf.ip)} ${ipv4ToString(l3Intf.mask)}`
            : "No ip";
          return `${l2Intf.name} ${l2Intf.type} ${l2Intf.maxMbps}Mbps ${MACToString(l2Intf.mac)} ${ip}`;
        })
        .join("\n"),
    ),
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
            done: true,
          },
        },
      },
    },
  },
} satisfies SubCommand<L3InternalStateBase>;
