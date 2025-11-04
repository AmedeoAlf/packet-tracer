import { Command, InternalState } from "../emulators/DeviceEmulator";

export const hello: Command<InternalState<object>> = {
  desc: 'Prints "Hello, World!"',
  run: ctx => ctx.write("Hello, World!")
}
