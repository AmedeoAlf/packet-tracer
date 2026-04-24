import { OSInternalState } from "../devices/list/Computer";
import { SubCommand } from "../emulators/DeviceEmulator";
import { listAll, writeFileInLocation } from "../emulators/utils/osFiles";

export const writeFile = <
  State extends OSInternalState<State>,
>(): SubCommand<State> => ({
  desc: "Write a file (overwrites and creates intermediate directories)",
  paramDesc: "Filepath",
  validate: () => true,
  autocomplete(state) {
    return listAll(state.filesystem).map((it) => ({
      option: it,
      desc: "file",
    }));
  },
  then: {
    done: true,
    run(ctx) {
      writeFileInLocation(ctx.state.filesystem, ctx.args![1], ctx.args![2]);
      ctx.updateState();
    },
  },
});
