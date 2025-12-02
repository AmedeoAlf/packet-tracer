import { Command, InternalState } from "../emulators/DeviceEmulator";

export function hello<T extends InternalState<object>>() {
  return {
    desc: 'Prints "Hello, World!"',
    run: (ctx) => ctx.write("Hello, World!"),
  } satisfies Command<T>;
}
