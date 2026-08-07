import { intRange } from "../common";
import { SubCommand } from "../emulators/DeviceEmulator";
import {
  cidrFromIpv4AndMask,
  cidrToIpv4AndMask,
  IPv4AndMask,
  L3InternalState,
} from "../protocols/rfc_760";

export type L3Rule = {
  type: "ip" | "icmp";
  source: IPv4AndMask;
  dest: IPv4AndMask;
  permit: boolean;
};

export type L4Rule = Omit<L3Rule, "type"> & {
  type: "udp" | "tcp";
  // destination port or -1
  port: number;
};

export type Rule = L3Rule | L4Rule;

export interface ACLInternalState<
  TSelf extends ACLInternalState<TSelf>,
> extends L3InternalState<TSelf> {
  aclRules: Rule[][];
  assignedACLs: (number | null)[];
  assignedACLsOut: (number | null)[];
}

function ruleToString(rule: Rule): string {
  const s = (it: IPv4AndMask) => (it[1] == 0 ? "any" : cidrFromIpv4AndMask(it));
  let res = `${rule.permit ? "permit" : "  deny"} ${rule.type.padEnd(5)} ${s(rule.source)} -> ${s(rule.dest)}`;
  if ("port" in rule)
    res += ` (${rule.port == -1 ? "any port" : "port " + rule.port})`;
  return res;
}

export const acl = <
  State extends ACLInternalState<State>,
>(): SubCommand<State> => ({
  desc: "Edit Access Control Lists",
  run: (ctx) =>
    ctx.state.aclRules.length == 0
      ? ctx.write("No Access Control Lists defined")
      : ctx.state.aclRules.forEach((list, idx) =>
          ctx.write(`ACL ${idx}\n` + list.map(ruleToString).join("\n")),
        ),
  autocomplete: (state) =>
    intRange(0, state.aclRules.length + 1).map((idx) => ({
      desc: "append to ACL " + idx,
      option: idx.toString(),
    })),
  validate: (state, past) => +past[1] >= 0 && +past[1] <= state.aclRules.length,
  paramDesc: "ACL idx",
  then: {
    subcommands: {
      permit: {
        desc: "allow matches",
        subcommands: filterArgs(true),
      },
      deny: {
        desc: "block matches",
        subcommands: filterArgs(false),
      },
      clear: {
        desc: "clear all rules",
        run(ctx) {
          const idx = +ctx.args![1];
          // Rule was not actually defined
          if (idx == ctx.state.aclRules.length) return;
          ctx.state.aclRules[idx] = [];
          // Are there any empty rules at the end that we might clear?
          if (idx == ctx.state.aclRules.length) {
            const lastRule = ctx.state.aclRules.findLastIndex(
              (it) => it.length != 0,
            );
            ctx.state.aclRules.length = lastRule + 1;
          }
          ctx.updateState();
        },
        done: true,
      },
    },
  },
});

const filterArgs = <S extends ACLInternalState<S>>(
  permit: boolean,
): Record<string, SubCommand<S>> => ({
  tcp: l4FilterArgs(permit, "tcp packets", "tcp"),
  udp: l4FilterArgs(permit, "udp packets", "udp"),
  ip: l3FilterArgs(permit, "any packet", "ip"),
  icmp: l3FilterArgs(permit, "icmp (ping) packets", "icmp"),
});

const l4FilterArgs = <S extends ACLInternalState<S>>(
  permit: boolean,
  desc: string,
  type: "tcp" | "udp",
): SubCommand<S> => ({
  desc,
  // TODO: maybe add some cidr autocomplete
  autocomplete: () => [],
  validate: (_, past) => typeof cidrToIpv4AndMask(past[4]) != "undefined",
  paramDesc: "source network/cidr",
  then: {
    // TODO: maybe add some cidr autocomplete
    autocomplete: () => [],
    validate: (_, past) => typeof cidrToIpv4AndMask(past[5]) != "undefined",
    paramDesc: "dest network/cidr",
    then: {
      autocomplete: () => [
        { option: "-1", desc: "any port" },
        ...(type == "tcp"
          ? [
              { option: "20", desc: "ftp" },
              { option: "21", desc: "ftp" },
              { option: "22", desc: "ssh" },
              { option: "25", desc: "smtp" },
              { option: "80", desc: "http" },
              { option: "443", desc: "https" },
            ]
          : [
              { option: "53", desc: "dns" },
              { option: "67", desc: "dhcp (server)" },
              { option: "68", desc: "dhcp (client)" },
            ]),
      ],
      validate: (_, past) => +past[6] >= -1 && +past[6] < 0x1000,
      paramDesc: "dest port",
      then: {
        run(ctx) {
          const rule: L4Rule = {
            source: cidrToIpv4AndMask(ctx.args![4])!,
            dest: cidrToIpv4AndMask(ctx.args![5])!,
            port: +ctx.args![6],
            type,
            permit,
          };

          const idx = +ctx.args![1];
          if (idx == ctx.state.aclRules.length) ctx.state.aclRules[idx] = [];
          ctx.state.aclRules[idx].push(rule);
          ctx.updateState();
        },
        done: true,
      },
    },
  },
});

const l3FilterArgs = <S extends ACLInternalState<S>>(
  permit: boolean,
  desc: string,
  type: "icmp" | "ip",
): SubCommand<S> => ({
  desc,
  // TODO: maybe add some cidr autocomplete
  autocomplete: () => [],
  validate: (_, past) => typeof cidrToIpv4AndMask(past[4]) != "undefined",
  paramDesc: "source network/cidr",
  then: {
    // TODO: maybe add some cidr autocomplete
    autocomplete: () => [],
    validate: (_, past) => typeof cidrToIpv4AndMask(past[5]) != "undefined",
    paramDesc: "dest network/cidr",
    then: {
      run(ctx) {
        const rule: L3Rule = {
          source: cidrToIpv4AndMask(ctx.args![4])!,
          dest: cidrToIpv4AndMask(ctx.args![5])!,
          type,
          permit,
        };

        const idx = +ctx.args![1];
        if (idx == ctx.state.aclRules.length) ctx.state.aclRules[idx] = [];
        ctx.state.aclRules[idx].push(rule);
        ctx.updateState();
      },
      done: true,
    },
  },
});

export default acl;
