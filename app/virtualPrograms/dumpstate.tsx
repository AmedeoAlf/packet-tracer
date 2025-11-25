import { Command, InternalState } from "../emulators/DeviceEmulator";
import { L3InternalState } from "../protocols/rfc_760";

export function dumpState<T extends L3InternalState<object>>() {
  return {
    desc: 'Dumps the device internal state',
    run: ctx => ctx.write(JSON.stringify(ctx.state.l3Ifs))
  } satisfies Command<T>;
}
