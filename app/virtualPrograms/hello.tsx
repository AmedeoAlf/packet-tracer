import { SubCommand, InternalState } from "../emulators/DeviceEmulator";

export const hello = {
  desc: 'Prints "Hello, World!"',
  run: (ctx) => ctx.write("Hello, World!"),
  done: true,
} satisfies SubCommand<InternalState<object>>;
