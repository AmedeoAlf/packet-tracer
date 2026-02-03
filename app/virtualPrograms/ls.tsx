import { OSInternalState } from "../devices/list/Computer";
import { SubCommand, EmulatorContext } from "../emulators/DeviceEmulator";
import { listAll } from "../emulators/utils/osFiles";

export const ls = {
  desc: "Lists all file in the system",
  run(ctx: EmulatorContext<OSInternalState>) {
    const files = listAll(ctx.state.filesystem);
    ctx.write(files.join("\n"));
  },
} satisfies SubCommand<OSInternalState>;
