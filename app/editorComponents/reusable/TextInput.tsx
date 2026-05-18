export function TextInput({
  value,
  setValue,
  className = "w-full text-xl",
}: {
  value: string;
  setValue: (s: string) => void;
  className?: string;
}) {
  return (
    <input
      className={
        "font-bold flex-1 bg-onsidebar px-2 py-1 rounded-md border-b " +
        className
      }
      type="text"
      size={2}
      value={value}
      onChange={(ev) => {
        setValue(ev.target.value);
      }}
    />
  );
}
