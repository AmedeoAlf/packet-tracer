import {
  DevicePanel,
  EmulatorContext,
  getAutoComplete,
  InternalState,
  runOnInterpreter,
} from "../emulators/DeviceEmulator";

function splitArgs(cmd: string) {
  if (cmd == "") return [""];
  const args = cmd.split(" ").filter((it) => it);
  if (cmd.endsWith(" ")) args.push("");
  return args;
}

export type TerminalEmulatorState = {
  inputBar: string;
  open: boolean;
  oldCmds: string[];
};

export default function TerminalEmulator<State extends InternalState<State>>(
  state: TerminalEmulatorState,
  setState: (s: TerminalEmulatorState) => void,
  content: string,
): DevicePanel<State> {
  return function TerminalEmulator(ctx: EmulatorContext<State>) {
    const setInput = (s: string) => {
      if (!s.endsWith("?")) {
        setState({ ...state, inputBar: s });
        return;
      }
      const lastArg = getAutoComplete({
        ...ctx,
        args: splitArgs(state.inputBar),
      });
      if (lastArg) {
        const args = splitArgs(s);
        args[args.length - 1] = lastArg;
        setState({ ...state, inputBar: args.join(" ") + " " });
      }
    };
    return (
      <div className="font-mono">
        <textarea
          ref={(area) => {
            if (area) area.scrollTop = area.scrollHeight;
          }}
          className="w-full bg-onsidebar p-2"
          value={content}
          rows={8}
          readOnly
        />
        <form
          onSubmit={() => {
            ctx.write("> " + state.inputBar);
            runOnInterpreter({
              args: splitArgs(state.inputBar),
              ...ctx,
            });
            setState({
              ...state,
              oldCmds: [...state.oldCmds, state.inputBar],
              inputBar: "",
            });
          }}
          method="dialog"
        >
          <input
            type="text"
            value={state.inputBar}
            placeholder=">"
            className="w-full bg-ontopbar p-1"
            onKeyDown={(ev) => {
              switch (ev.key) {
                case "Tab":
                  ev.preventDefault();
                  const args = splitArgs(state.inputBar);
                  const lastArg = getAutoComplete({
                    ...ctx,
                    args,
                  });
                  if (lastArg) {
                    args[args.length - 1] = lastArg;
                    setInput(args.join(" "));
                  }
                  break;
                case "ArrowUp":
                  ev.preventDefault();
                  if (state.inputBar == "") {
                    setInput(state.oldCmds.at(-1) ?? "");
                  } else {
                    const previousCmd =
                      state.oldCmds.findLastIndex(
                        (it) => it == state.inputBar,
                      ) - 1;
                    if (previousCmd >= 0) setInput(state.oldCmds[previousCmd]);
                  }
                  break;
                case "ArrowDown":
                  ev.preventDefault();
                  const nextCmd =
                    state.oldCmds.findLastIndex((it) => it == state.inputBar) +
                    1;
                  setInput(state.oldCmds.at(nextCmd) ?? "");
                  break;
              }
            }}
            onChange={(ev) => setInput(ev.target.value)}
          />
        </form>
      </div>
    );
  };
}
