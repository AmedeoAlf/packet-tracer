import { Button } from "./RoundBtn";

export function DropDown({
  open, setOpen, selected, setSelected, panels
}: {
  open: boolean,
  setOpen: (open: boolean) => void,
  selected: string,
  setSelected: (sel: string) => void,
  panels: string[]
}) {
  return <> <Button
    className="bg-zinc-800 flex-row"
    onClick={() => setOpen(!open)}
  >
    <div className="flex items-center justify-center w-full gap-2">
      {selected}
      <svg
        viewBox="0 0 20 11"
        height={10}
        className={
          "transition " +
          (open ? "rotate-180" : "")
        }
      >
        <path
          d="M 2 2 l 7 7 l 7 -7"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  </Button>
    <div
      className={
        "transition-all p-1 flex rounded-md overflow-y-auto flex-col gap-1 bg-zinc-800 " +
        (open ? "h-30" : "h-0 scale-y-0")
      }
    >
      {panels.map((panel) => (
        <Button
          key={panel}
          onClick={
            panel == selected
              ? undefined
              : () => setSelected(panel)
          }
          className={
            "w-full " +
            (panel == selected
              ? "bg-zinc-800 brightness-90"
              : "bg-zinc-900")
          }
        >
          {panel}
        </Button>
      ))}
    </div></>;
}
