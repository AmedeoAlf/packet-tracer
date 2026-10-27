import { DetailedHTMLProps, InputHTMLAttributes } from "react";

export function TextInput({
  value,
  setValue,
  className = "w-full text-xl",
  ...props
}: {
  value: string;
  setValue: (s: string) => void;
} & DetailedHTMLProps<
  InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>) {
  return (
    <input
      className={
        "font-bold bg-onsidebar px-2 py-1 rounded-md border-b " + className
      }
      type="text"
      size={2}
      value={value}
      onChange={(ev) => {
        setValue(ev.target.value);
      }}
      {...props}
    />
  );
}
