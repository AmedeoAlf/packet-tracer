import { KeyboardEventHandler } from "react";
import {
  DevicePanel,
  EmulatorContext,
  getAutoComplete,
  InternalState,
  runOnInterpreter,
} from "../emulators/DeviceEmulator";
import FullscreenTerm from "./FullscreenTerm";

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
  deviceName: string,
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
        setState({ ...state, inputBar: args.join(" ") });
      }
    };
    const execute = () => {
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
    };

    const keyHandler: KeyboardEventHandler = (ev) => {
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
              state.oldCmds.findLastIndex((it) => it == state.inputBar) - 1;
            if (previousCmd >= 0) setInput(state.oldCmds[previousCmd]);
          }
          break;
        case "ArrowDown":
          ev.preventDefault();
          const nextCmd =
            state.oldCmds.findLastIndex((it) => it == state.inputBar) + 1;
          setInput(state.oldCmds.at(nextCmd) ?? "");
          break;
      }
    };
    return (
      <div className="font-mono relative">
        <button
          className="absolute box right-1 top-1 rounded-full transition hover:bg-sidebar/50 p-3"
          onClick={() => setState({ ...state, open: true })}
        >
          <svg
            viewBox="0 0 20 20"
            height={12}
            strokeLinecap="round"
            className={"transition stroke-foreground stroke-3"}
          >
            <line x1={2} x2={18} y1={2} y2={18} />
            <line x2={2} x1={18} y1={2} y2={18} />
            <path d="M 2 6 L 2 2 L 6 2" />
            <path d="M 18 14 L 18 18 L 13 18" />
            <path d="M 2 14 L 2 18 L 6 18" />
            <path d="M 18 6 L 18 2 L 14 2" />
          </svg>
        </button>
        <textarea
          ref={(area) => {
            if (area) area.scrollTop = area.scrollHeight;
          }}
          className="w-full bg-onsidebar p-2"
          value={content}
          rows={8}
          readOnly
        />
        <form onSubmit={execute} method="dialog">
          <input
            type="text"
            value={state.inputBar}
            placeholder=">"
            className="w-full bg-ontopbar p-1"
            onKeyDown={keyHandler}
            onChange={(ev) => setInput(ev.target.value)}
          />
        </form>
        <FullscreenTerm
          active={state.open}
          setActive={(open) => setState({ ...state, open })}
          input={state.inputBar}
          setInput={setInput}
          execute={execute}
          title={deviceName}
          log={content}
          keyHandler={keyHandler}
        />
      </div>
    );
  };
}
