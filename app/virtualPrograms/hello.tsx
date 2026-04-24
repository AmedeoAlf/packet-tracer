import { SubCommand, InternalState } from "../emulators/DeviceEmulator";

export const hello = <
  State extends InternalState<State>,
>(): SubCommand<State> => ({
  desc: 'Prints "Hello, World!"',
  run: (ctx) => ctx.write("Hello, World!"),
  done: true,
});
