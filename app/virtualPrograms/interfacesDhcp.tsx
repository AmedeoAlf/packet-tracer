import { DhcpInternalState } from "../devices/list/Computer";
import { runOnInterpreter, SubCommand } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";
import { ipv4ToString, parseIpv4 } from "../protocols/rfc_760";
import { interfaces } from "./interfaces";

export const interfacesDhcp = <
  State extends DhcpInternalState<State>,
>(): SubCommand<State> =>
  interfaces<State>(
    (state, idx) => {
      const l2Intf = state.netInterfaces[idx];
      const l3Intf = state.l3Ifs.at(idx);
      const dhcpEnabled = state.dhcpEnabled[idx];
      const ip = l3Intf
        ? `${ipv4ToString(l3Intf.ip)} ${ipv4ToString(l3Intf.mask)}`
        : "No ip";
      return `${l2Intf.name} ${l2Intf.type} ${l2Intf.maxMbps}Mbps ${MACToString(l2Intf.mac)} ${ip} ${dhcpEnabled ? "(dhcp)" : ""}`;
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
          paramDesc: "New ip address (or 'dhcp')",
          autocomplete: (_, past) =>
            past[3].startsWith("d")
              ? [{ option: "dhcp", desc: "Use dhcp-assigned ip" }]
              : [],
          validate: (_, past) =>
            past[3] == "dhcp" || parseIpv4(past[3]) !== undefined,
          then: {
            run(ctx) {
              if (ctx.args![3] != "dhcp") {
                ctx.write("specify subnet mask");
                return;
              }
              const intfId = ctx.state.netInterfaces.findIndex(
                (it) => it.name == ctx.args![2],
              );
              if (ctx.state.dhcpEnabled[intfId]) return;
              ctx.state.dhcpEnabled[intfId] = true;
              ctx.state.l3Ifs[intfId] = null;
              ctx.updateState();
            },
            paramDesc: "Subnet mask",
            autocomplete: () => [],
            validate: (_, past) =>
              past[3] == "dhcp" || parseIpv4(past[4]) !== undefined,
            then: {
              run(ctx) {
                if (ctx.args![3] == "dhcp") {
                  runOnInterpreter({
                    ...ctx,
                    args: ctx.args!.slice(0, 4),
                  });
                  return;
                }
                const intfId = ctx.state.netInterfaces.findIndex(
                  (it) => it.name == ctx.args![2],
                );
                const ip = parseIpv4(ctx.args![3])!;
                const mask = parseIpv4(ctx.args![4])!;
                if (ctx.state.dhcpEnabled[intfId]) {
                  ctx.state.dhcpEnabled[intfId] = false;
                  ctx.write("dhcp disabled");
                }
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
