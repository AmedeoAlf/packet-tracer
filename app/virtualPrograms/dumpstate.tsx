import { SubCommand, InternalState } from "../emulators/DeviceEmulator";

export function dumpState<T extends InternalState<object>>() {
  return {
    desc: "Dumps the device internal state",
    run: (ctx) => ctx.write(JSON.stringify(ctx.state)),
  } satisfies SubCommand<T>;
}
