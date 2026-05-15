export function TextInput({
  value,
  setValue,
}: {
  value: string;
  setValue: (s: string) => void;
}) {
  return (
    <input
      className="text-xl font-bold flex-1 bg-onsidebar w-full px-2 py-1 rounded-md border-b"
      type="text"
      size={2}
      value={value}
      onChange={(ev) => {
        setValue(ev.target.value);
      }}
    />
  );
}
