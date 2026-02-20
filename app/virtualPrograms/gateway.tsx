import { OSInternalState } from "../devices/list/Computer";
import { SubCommand } from "../emulators/DeviceEmulator";
import { ipv4ToString, parseIpv4 } from "../protocols/rfc_760";

export const gatewayCmd = {
  desc: "Reads or sets device gateway",
  run(ctx) {
    const state = ctx.state as OSInternalState;
    ctx.write(ipv4ToString(state.gateway));
  },
  autocomplete: () => [],
  validate: (_, past) => typeof parseIpv4(past[1]) != "undefined",
  paramDesc: "New gateway",
  then: {
    done: true,
    run(ctx) {
      const state = ctx.state as OSInternalState;
      state.gateway = parseIpv4(ctx.args![1])!;
      ctx.updateState();
    },
  },
} satisfies SubCommand<OSInternalState>;
