import React from "react";

export function Button({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={"h-8 rounded-md font-bold px-2 " + (className ?? "")}
      {...props}
    >
      {children}
    </button>
  );
}
