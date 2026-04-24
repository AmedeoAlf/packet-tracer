import { OSInternalState } from "../devices/list/Computer";
import { SubCommand } from "../emulators/DeviceEmulator";
import { listAll } from "../emulators/utils/osFiles";

export const ls = <
  State extends OSInternalState<State>,
>(): SubCommand<State> => ({
  desc: "Lists all file in the system",
  done: true,
  run(ctx) {
    const files = listAll(ctx.state.filesystem);
    ctx.write(files.join("\n"));
  },
});
