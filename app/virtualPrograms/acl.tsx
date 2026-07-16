import { SubCommand } from "../emulators/DeviceEmulator";
import { IPv4AndMask, L3InternalState } from "../protocols/rfc_760";

export enum PacketType {
  IP,
  ICMP,
  TCP,
  UDP,
}

export type L3Rule = {
  type: "ip" | "icmp";
  source: IPv4AndMask;
  dest: IPv4AndMask;
  permit: boolean;
};

export type L4Rule = Omit<L3Rule, "type"> & {
  type: "udp" | "tcp";
  sourcePort: number;
  destPort: number;
};

export type Rule = L3Rule | L4Rule;

export interface ACLInternalState<
  TSelf extends ACLInternalState<TSelf>,
> extends L3InternalState<TSelf> {
  aclL3Rules: Rule[][];
}

// TODO:
function ruleToString(rule: Rule): string {
  let res = `${rule.type.padEnd(5)} `;
  if ("sourcePort" in rule) {
  }
  return res;
}

export const acl = <
  State extends ACLInternalState<State>,
>(): SubCommand<State> => ({
  desc: "Edit Access Control Lists",
  run: (ctx) => ctx.write("Hello, World!"),
  done: true,
});

export default acl;
