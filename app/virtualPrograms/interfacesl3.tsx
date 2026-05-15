import { SubCommand } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";
import { ipv4ToString, L3InternalState, parseIpv4 } from "../protocols/rfc_760";
import { interfaces } from "./interfaces";

export const interfacesL3 = <
  State extends L3InternalState<State>,
>(): SubCommand<State> =>
  interfaces<State>(
    (state, idx) => {
      const l2Intf = state.netInterfaces[idx];
      const l3Intf = state.l3Ifs.at(idx);
      const ip = l3Intf
        ? `${ipv4ToString(l3Intf.ip)} ${ipv4ToString(l3Intf.mask)}`
        : "No ip";
      return `${l2Intf.name} ${l2Intf.type} ${l2Intf.maxMbps}Mbps ${MACToString(l2Intf.mac)} ${ip}`;
    },
    {
      "set-ip": {
        desc: "Sets an interface ip",
        paramDesc: "Interface",
        autocomplete: (state) =>
          state.netInterfaces.flatMap((it, idx) => {
            if (it.type == "localhost") return [];
            const ipv4 = state.l3Ifs.at(idx)?.ip;
            return [
              {
                desc: `${it.type} ${it.maxMbps} Mbps ${ipv4 ? ipv4ToString(ipv4) : "No ip"}`,
                option: it.name,
              },
            ];
          }),
        validate(state, args) {
          return state.netInterfaces.some(
            (it) => it.type != "localhost" && it.name == args[2],
          );
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
              run(ctx) {
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
  );

export default interfaces;
