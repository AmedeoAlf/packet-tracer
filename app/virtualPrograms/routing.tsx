import {
  arrayOffsetElement,
  countLeadingOnes,
  i32WithLeadingOnes,
} from "../common";
import { RouterInternalState } from "../devices/list/Router";
import { SubCommand } from "../emulators/DeviceEmulator";
import { ipv4ToString, parseIpv4 } from "../protocols/rfc_760";

export const routing = {
  desc: "Change routing settings",
  subcommands: {
    add: {
      desc: "Add a new entry to the routing table",
      autocomplete: () => [],
      validate(_, past) {
        const [ip, cidr] = past[2].split("/");
        return typeof parseIpv4(ip) == "number" && !isNaN(+cidr) && +cidr < 32;
      },
      paramDesc: "Network ip/CIDR",
      then: {
        autocomplete: () => [],
        validate: (_, past) => typeof parseIpv4(past[3]) == "number",
        paramDesc: "Next hop",
        then: {
          run(ctx) {
            const state = ctx.state as RouterInternalState;
            const [netStr, cidr] = ctx.args![2].split("/");
            const hop = parseIpv4(ctx.args![3])!;
            state.routingTables.push({
              netAddr: parseIpv4(netStr)!,
              mask: i32WithLeadingOnes(+cidr),
              to: hop,
            });
            ctx.updateState();
          },
          done: true,
        },
      },
    },
    remove: {
      desc: "Remove an entry from the routing table",
      autocomplete: tableEntryAutocomplete,
      validate: (state, past) =>
        !isNaN(+past[2]) && +past[2] < state.routingTables.length,
      paramDesc: "Idx of entry",
      then: {
        run(ctx) {
          (ctx.state as RouterInternalState).routingTables.splice(
            +ctx.args![2],
            1,
          );
          ctx.updateState();
        },
        done: true,
      },
    },
    "set-priority": {
      desc: "Changes priority of a routing table",
      autocomplete: tableEntryAutocomplete,
      validate: (state, past) =>
        !isNaN(+past[2]) && +past[2] < state.routingTables.length,
      paramDesc: "Idx of entry",
      then: {
        autocomplete: () => [],
        validate: (_, past) => !isNaN(+past[3]),
        paramDesc: "Offset (1 to decrease, -1 to increase)",
        then: {
          run(ctx) {
            arrayOffsetElement(
              (ctx.state as RouterInternalState).routingTables,
              +ctx.args![2],
              +ctx.args![3],
            );
            ctx.updateState();
          },
          done: true,
        },
      },
    },
  },
} satisfies SubCommand<RouterInternalState>;

function tableEntryAutocomplete(state: RouterInternalState) {
  return [
    ...state.routingTables.entries().map(([idx, entry]) => ({
      option: idx.toString(),
      desc: `${ipv4ToString(entry.netAddr)}/${countLeadingOnes(entry.mask)} to ${ipv4ToString(entry.to)}`,
    })),
  ];
}
