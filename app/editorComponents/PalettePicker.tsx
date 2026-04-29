import { cssPaletteColor, intRange, PALETTE_LEN } from "../common";

export function PalettePicker({
  value,
  setValue,
  className = "flex gap-1",
}: {
  value?: number;
  setValue: (idx: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {intRange(0, PALETTE_LEN).map((idx) => (
        <ColorCard
          key={idx}
          color={idx}
          selected={value === idx}
          onClick={() => setValue(idx)}
          className="w-10 h-8 rounded-md"
        />
      ))}
    </div>
  );
}

export function ColorCard({
  selected,
  color,
  onClick,
  className = "",
}: {
  selected: boolean;
  color: number;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${className} border-4 ${selected ? "border-selected-border" : "border-selectable-border"}`}
      style={{ backgroundColor: cssPaletteColor(color) }}
    ></button>
  );
}
