import { OSInternalState } from "../devices/list/Computer";
import { SubCommand } from "../emulators/DeviceEmulator";
import { listAll, readFile } from "../emulators/utils/osFiles";

export const cat = <
  State extends OSInternalState<State>,
>(): SubCommand<State> => ({
  desc: "Prints a file content",
  paramDesc: "Filepath",
  validate: (state, past) =>
    typeof readFile(state.filesystem, past[1]) == "string",
  autocomplete(state) {
    return listAll(state.filesystem).map((it) => ({
      option: it,
      desc: "file",
    }));
  },
  then: {
    done: true,
    run(ctx) {
      // run() only gets called when validate() is true, when the file is
      // missing an error is printed by runOnInterpreter
      const file = readFile(ctx.state.filesystem, ctx.args![1]) as string;
      ctx.write(file);
    },
  },
});
