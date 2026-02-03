import { OSInternalState } from "../devices/list/Computer";
import { SubCommand, EmulatorContext } from "../emulators/DeviceEmulator";
import { listAll, writeFileInLocation } from "../emulators/utils/osFiles";

export const writeFile = {
  desc: "Write a file (overwrites and creates intermediate directories)",
  paramDesc: "Filepath",
  validate: () => true,
  autocomplete(state: OSInternalState) {
    return listAll(state.filesystem).map((it) => ({
      option: it,
      desc: "file",
    }));
  },
  then: {
    run(ctx: EmulatorContext<OSInternalState>) {
      writeFileInLocation(ctx.state.filesystem, ctx.args![1], ctx.args![2]);
      ctx.updateState();
    },
  },
} satisfies SubCommand<OSInternalState>;
