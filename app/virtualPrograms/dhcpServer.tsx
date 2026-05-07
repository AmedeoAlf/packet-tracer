import { RouterInternalState } from "../devices/list/Router";
import { runOnInterpreter, SubCommand } from "../emulators/DeviceEmulator";
import { DHCPSettings } from "../emulators/utils/dhcpServer";
import { ipv4ToString, parseIpv4 } from "../protocols/rfc_760";

const ipProps = [
  "network",
  "mask",
  "gateway",
  "dns",
] satisfies (keyof DHCPSettings)[];

export const dhcpCmd = (): SubCommand<RouterInternalState> => ({
  desc: "Manages dhcp",
  run(ctx) {
    if (!ctx.state.dhcpSettings) {
      ctx.write("Service must be enabled");
      return;
    }
    for (const prop of ipProps) {
      ctx.write(`${prop}: ${ipv4ToString(ctx.state.dhcpSettings[prop])}`);
    }
    ctx.write("Excluded addresses:");
    runOnInterpreter({
      ...ctx,
      args: "dhcp exclude".split(" "),
    });
  },
  subcommands: {
    on: {
      desc: "Enables service",
      run(ctx) {
        ctx.state.dhcpSettings = {
          dns: 0,
          excluded: [],
          gateway: 0,
          mask: 0xffffff00,
          network: 0,
        };
        ctx.updateState();
      },
      done: true,
    },
    off: {
      desc: "Disables service",
      run(ctx) {
        ctx.state.dhcpSettings = undefined;
        ctx.updateState();
      },
      done: true,
    },
    // the actual properties
    ...Object.fromEntries(ipProps.map((it) => propGetSet(it))),
    exclude: {
      desc: "Exclude addresses from dhcp pool",
      validate: (_, past) => typeof parseIpv4(past[2]) == "number",
      autocomplete: () => [],
      paramDesc: "Start of range",
      then: {
        validate: (_, past) => typeof parseIpv4(past[3]) == "number",
        autocomplete: () => [],
        paramDesc: "End of range (inclusive)",
        then: {
          run(ctx) {
            if (!ctx.state.dhcpSettings) {
              ctx.write("Service must be enabled");
              return;
            }
            ctx.state.dhcpSettings.excluded.push([
              parseIpv4(ctx.args![2])!,
              parseIpv4(ctx.args![3])!,
            ]);
            ctx.updateState();
          },
          done: true,
        },
      },
      run(ctx) {
        if (!ctx.state.dhcpSettings) {
          ctx.write("Service must be enabled");
          return;
        }
        if (ctx.state.dhcpSettings.excluded.length == 0) {
          ctx.write("None");
          return;
        }

        ctx.write(
          ctx.state.dhcpSettings.excluded
            .map(([a, b]) => `${ipv4ToString(a)}-${ipv4ToString(b)}`)
            .join("\n"),
        );
      },
    },
    "clear-excluded": {
      desc: "Restores all ip addresses to dhcp pool",
      done: true,
      run(ctx) {
        if (!ctx.state.dhcpSettings) {
          ctx.write("Service must be enabled");
          return;
        }
        ctx.state.dhcpSettings.excluded.length = 0;
        ctx.updateState();
      },
    },
  },
});

function propGetSet(
  prop: Exclude<keyof DHCPSettings, "excluded">,
): [keyof DHCPSettings, SubCommand<RouterInternalState>] {
  return [
    prop,
    {
      desc: `Get/Set "${prop}" dhcp option`,
      run(ctx) {
        if (!ctx.state.dhcpSettings) {
          ctx.write("Service must be enabled");
        } else {
          ctx.write(ipv4ToString(ctx.state.dhcpSettings[prop]));
        }
      },
      autocomplete: () => [],
      validate: (_, past) => typeof parseIpv4(past[2]) == "number",

      paramDesc: `Sets "${prop}" value`,
      then: {
        run(ctx) {
          if (!ctx.state.dhcpSettings) {
            ctx.write("Service must be enabled");
            return;
          }
          ctx.state.dhcpSettings[prop] = parseIpv4(ctx.args![2])!;
          ctx.updateState();
        },
        done: true,
      },
    },
  ];
}
