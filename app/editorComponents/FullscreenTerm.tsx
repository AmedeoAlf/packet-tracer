import { KeyboardEventHandler, useEffect, useRef } from "react";
import { TextInput } from "./reusable/TextInput";

export default function FullscreenTerm({
  title,
  log,
  execute,
  input,
  setInput,
  active,
  setActive,
  keyHandler,
}: {
  title: string;
  log: string;
  execute: () => void;
  input: string;
  setInput: (s: string) => void;
  active: boolean;
  setActive: (b: boolean) => void;
  keyHandler: KeyboardEventHandler;
}) {
  const logWindow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logWindow.current)
      logWindow.current.scrollTop = logWindow.current.scrollHeight;
  }, [log]);

  return (
    <div
      className={
        "transition duration-500 ease-in-out h-screen w-screen fixed top-0 left-0 p-10 transition-discrete " +
        (active ? "" : " translate-y-full opacity-0")
      }
    >
      <div className="bg-sidebar p-4 rounded-2xl shadow-2xl relative flex flex-col h-full">
        <button
          className="absolute box right-1 top-1 rounded-full transition hover:bg-onsidebar/50 p-3"
          onClick={() => setActive(false)}
        >
          <svg
            viewBox="0 0 20 20"
            height={12}
            strokeLinecap="round"
            className={"transition stroke-foreground stroke-3"}
          >
            <line x1={2} x2={18} y1={2} y2={18} />
            <line x2={2} x1={18} y1={2} y2={18} />
          </svg>
        </button>

        <h2 className="text-xl font-bold">{title}</h2>
        <div
          className="flex-1 whitespace-pre-line font-mono overflow-y-scroll"
          ref={logWindow}
        >
          {log}
        </div>
        <form onSubmit={execute} method="dialog">
          <TextInput
            value={input}
            setValue={setInput}
            onKeyDown={keyHandler}
            placeholder="> "
            className="font-normal w-full text-lg"
          />
        </form>
      </div>
    </div>
  );
}
