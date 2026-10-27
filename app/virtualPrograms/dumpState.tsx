import { SubCommand, InternalState } from "../emulators/DeviceEmulator";

export const dumpState = <
  State extends InternalState<State>,
>(): SubCommand<State> => ({
  desc: "Dumps internalState",
  run(ctx) {
    ctx.write(JSON.stringify(ctx.state));
  },
});

export default dumpState;
