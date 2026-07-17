import { SubCommand } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";
import { ipv4ToString, parseIpv4 } from "../protocols/rfc_760";
import { ACLInternalState } from "./acl";
import { interfaces } from "./interfaces";

export const routerInterfaces = <
  State extends ACLInternalState<State>,
>(): SubCommand<State> =>
  interfaces<State>(
    (state, idx) => {
      const l2Intf = state.netInterfaces[idx];
      const l3Intf = state.l3Ifs.at(idx);
      const ip = l3Intf
        ? `${ipv4ToString(l3Intf.ip)} ${ipv4ToString(l3Intf.mask)}`
        : "No ip";
      const acl = state.assignedACLs.at(idx);
      const aclStr = typeof acl == "undefined" ? "" : ` acl ${acl}`;
      return `${l2Intf.name} ${l2Intf.type} ${l2Intf.maxMbps}Mbps ${MACToString(l2Intf.mac)} ${ip}${aclStr}`;
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
      acl: {
        desc: "sets applied acl",
        run: (ctx) =>
          ctx.write(
            ctx.state.assignedACLs.at(+ctx.args![3])?.toString() ?? "no acl",
          ),
        validate(state, past) {},
      },
    },
  );

export default routerInterfaces;
