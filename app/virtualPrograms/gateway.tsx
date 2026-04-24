import { SubCommand } from "../emulators/DeviceEmulator";
import { ipv4ToString, L3InternalState, parseIpv4 } from "../protocols/rfc_760";

export const gatewayCmd = <
  State extends L3InternalState<State>,
>(): SubCommand<State> => ({
  desc: "Reads or sets device gateway",
  run: (ctx) => ctx.write(ipv4ToString(ctx.state.gateway)),
  autocomplete: () => [],
  validate: (_, past) => typeof parseIpv4(past[1]) != "undefined",
  paramDesc: "New gateway",
  then: {
    done: true,
    run(ctx) {
      ctx.state.gateway = parseIpv4(ctx.args![1])!;
      ctx.updateState();
    },
  },
});
