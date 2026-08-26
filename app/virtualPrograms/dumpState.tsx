import { SubCommand, InternalState } from "../emulators/DeviceEmulator";

export const dumpState = <
  State extends InternalState<State>,
>(): SubCommand<State> => ({
  desc: "Dumps internalState",
  run(ctx) {
    ctx.write(JSON.stringify(ctx.state));
  },
  done: true,
});

export default dumpState;
