import { SubCommand } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";
import {
  cidrFromIpv4AndMask,
  ipv4ToString,
  parseIpv4,
} from "../protocols/rfc_760";
import { ACLInternalState } from "./acl";
import { interfaces } from "./interfaces";

export const routerInterfaces = <
  State extends ACLInternalState<State>,
>(): SubCommand<State> =>
  interfaces<State>(
    (state, idx) => {
      const l2Intf = state.netInterfaces[idx];
      const l3Intf = state.l3Ifs.at(idx);
      const ip = l3Intf ? cidrFromIpv4AndMask(l3Intf) : "No ip";

      let aclStr = "";
      {
        const aclIn = state.assignedACLs.at(idx);
        const aclOut = state.assignedACLsOut.at(idx);
        if (typeof aclIn == "number") aclStr += ` acl-in=${aclIn}`;
        if (typeof aclOut == "number") aclStr += ` acl-out=${aclOut}`;
      }

      return `${l2Intf.name} ${l2Intf.type} ${l2Intf.maxMbps}Mbps ${MACToString(l2Intf.mac)} ${ip}${aclStr}`;
    },
    {
      "set-ip": {
        desc: "Sets an interface ip",
        paramDesc: "Interface",
        autocomplete: (state) =>
          state.netInterfaces.flatMap((it, idx) => {
            if (it.type == "localhost") return [];
            const ipv4 = state.l3Ifs.at(idx)?.at(0);
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
                ctx.state.l3Ifs[intfId] = [ip, mask];
                ctx.updateState();
              },
              done: true,
            },
          },
        },
      },
      acl: {
        desc: "sets applied acl",
        validate: (state, past) =>
          state.netInterfaces.some((it) => it.name == past[2]),
        autocomplete: (state) =>
          state.netInterfaces.flatMap((it, idx) => {
            if (it.type == "localhost") return [];
            const ipv4 = state.l3Ifs.at(idx)?.at(0);
            return [
              {
                desc: `${it.type} ${it.maxMbps} Mbps ${ipv4 ? ipv4ToString(ipv4) : "No ip"}`,
                option: it.name,
              },
            ];
          }),
        paramDesc: "interface",
        then: {
          paramDesc: "acl to use/-1",
          validate(_, past) {
            const idx = parseInt(past[3]);
            return idx >= -1;
          },
          autocomplete(state) {
            return [
              ...state.aclRules.map((v, idx) => ({
                desc: `${v.length} rules`,
                option: idx.toString(),
              })),
              { desc: "remove acl", option: "-1" },
            ];
          },
          then: {
            subcommands: {
              in: {
                desc: "run on entering packets",
                run(ctx) {
                  const intf = ctx.state.netInterfaces.findIndex(
                    (it) => it.name == ctx.args![2],
                  );
                  const acl = parseInt(ctx.args![3]);
                  if (acl == -1) {
                    delete ctx.state.assignedACLs[intf];
                    ctx.state.assignedACLs.length =
                      ctx.state.assignedACLs.findLastIndex(
                        (it) => typeof it == "number",
                      ) + 1;
                  } else {
                    ctx.state.assignedACLs[intf] = acl;
                  }
                },
                done: true,
              },
              out: {
                desc: "run on exiting packets",
                run(ctx) {
                  const intf = ctx.state.netInterfaces.findIndex(
                    (it) => it.name == ctx.args![2],
                  );
                  const acl = parseInt(ctx.args![3]);
                  if (acl == -1) {
                    delete ctx.state.assignedACLsOut[intf];
                    ctx.state.assignedACLsOut.length =
                      ctx.state.assignedACLsOut.findLastIndex(
                        (it) => typeof it == "number",
                      ) + 1;
                  } else {
                    ctx.state.assignedACLsOut[intf] = acl;
                  }
                },
                done: true,
              },
            },
          },
        },
      },
    },
  );

export default routerInterfaces;
