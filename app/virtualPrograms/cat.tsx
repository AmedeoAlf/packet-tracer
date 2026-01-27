import { OSInternalState } from "../devices/list/Computer";
import { SubCommand, InternalState, EmulatorContext } from "../emulators/DeviceEmulator";
import { listAll, readFile } from "../emulators/utils/osFiles";

export const cat = {
    desc: 'Prints a file content',
    paramDesc: "Filepath",
    validate: () => true,
    autocomplete(state: OSInternalState) {
        return listAll(state.filesystem).map(it => ({ option: it, desc: "file" }));
    },
    then: {
        run(ctx: EmulatorContext<OSInternalState>) {
            const file = readFile(ctx.state.filesystem, ctx.args![1])
            console.log(ctx.state.filesystem, file)
            ctx.write(typeof file == "string" ? file : "File not found");
        },
    }
} satisfies SubCommand<OSInternalState>;
