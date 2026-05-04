import { JSX } from "react";
import { TOOLS } from "./Tool";

export function WrapToolIcon({ icon }: { icon: keyof typeof TOOL_ICONS }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 50 50"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      {TOOL_ICONS[icon]}
    </svg>
  );
}

export const TOOL_ICONS = {
  select: (
    <path
      strokeWidth={4.23}
      stroke="var(--foreground)"
      strokeLinejoin="round"
      fill="var(--foreground)"
      d="m 36.00,11.58 -22.00,15.11 13.58,-0.09 6.71,11.81 z"
    />
  ),
  connect: (
    <>
      <path
        strokeWidth={4}
        stroke="var(--foreground)"
        strokeLinejoin="round"
        fill="var(--foreground)"
        d="m 26.09,12.94 h 8.90 l -7.00,-4.24 7.00,4.24 h 3.50 v 5.81 H 26.09 Z"
      />
      <path
        strokeWidth={4}
        fill="none"
        stroke="var(--foreground)"
        d="M 24.49,15.85 C 9.19,16.68 13.98,28.21 23.63,28.45 c 9.64,0.23 14.45,11.47 -0.37,12.26"
      />
    </>
  ),
  add: (
    <>
      <path
        strokeWidth={4.5}
        stroke="var(--foreground)"
        strokeLinejoin="round"
        fill="none"
        d="m 21.81,22.42 c -7.07,2e-5 -12.81,1.95 -12.81,4.36 v 8.95 c -8.75e-4,2.41 5.73,4.36 12.81,4.36 7.07,-2.1e-5 12.81,-1.95 12.81,-4.36 v -8.95 c -0.00,-2.41 -5.73,-4.36 -12.81,-4.36 z"
      />
      <path
        strokeWidth={4.5}
        stroke="var(--foreground)"
        strokeLinejoin="round"
        fill="none"
        d="m 21.81,31.15 c -7.07,-2e-5 -12.81,-1.95 -12.81,-4.36 l -10e-7,8.95 c -8.75e-4,2.41 5.73,4.36 12.81,4.36 7.07,-2.1e-5 12.81,-1.95 12.81,-4.36 l 10e-7,-8.95 c -0.00,2.41 -5.73,4.36 -12.81,4.36 z"
      />
      <path
        strokeWidth={2}
        stroke="var(--foreground)"
        strokeLinejoin="round"
        fill="var(--foreground)"
        d="M 35.29,7.89 V 9.49 12.41 H 32.37 30.78 v 3.19 h 1.59 2.91 v 2.91 1.59 h 3.20 v -1.59 -2.91 h 2.91 1.59 V 12.41 H 41.42 38.50 V 9.49 7.89 Z"
      />
    </>
  ),
  rect: (
    <>
      <path
        strokeWidth={4}
        stroke="var(--foreground)"
        strokeLinejoin="round"
        fill="none"
        d="M 10.07,21.14 H 38.17 V 39.34 H 10.07 Z"
      />
      <path
        strokeWidth={2}
        stroke="var(--foreground)"
        strokeLinejoin="round"
        fill="var(--foreground)"
        d="M 35.29,7.89 V 9.49 12.41 H 32.37 30.78 v 3.19 h 1.59 2.91 v 2.91 1.59 h 3.20 v -1.59 -2.91 h 2.91 1.59 V 12.41 H 41.42 38.50 V 9.49 7.89 Z"
      />
    </>
  ),
  label: (
    <path
      fill="var(--foreground)"
      d="M 40.38,17.69 37.89,9.88 H 12.14 l -2.53,7.81 1.46,0.53 c 2.61,-4.61 5.68,-6.65 9.76,-6.65 1.46,0 1.95,0.44 1.95,1.77 v 20.37 c 0,3.59 -0.66,4.70 -2.88,4.88 l -1.73,0.13 v 1.37 H 31.85 V 38.73 l -1.73,-0.13 c -2.21,-0.17 -2.88,-1.28 -2.88,-4.88 V 13.52 c 0,-1.55 0.35,-1.95 1.81,-1.95 3.90,0 7.27,2.30 9.76,6.65 z"
    />
  ),
  hand: (
    <path
      strokeLinejoin="round"
      fill="var(--foreground)"
      d="m 25.73,7.94 c -1.54,0 -2.78,1.24 -2.78,2.78 v 3.20 c 0,-1.54 -1.24,-2.78 -2.78,-2.78 -1.54,0 -2.78,1.24 -2.78,2.78 v 14.49 l -1.97,-4.91 c -0.57,-1.42 -2.19,-2.12 -3.62,-1.54 -1.42,0.57 -2.12,2.20 -1.54,3.63 l 1.77,4.40 1.77,4.40 c 0.03,0.09 0.08,0.18 0.12,0.27 2.58,5.36 7.84,7.02 9.76,6.94 l 6.78,-0.11 c 4.18,-0.04 9.05,-6.50 9.16,-9.87 l 0.08,-2.68 V 17.68 c 0,-1.54 -1.24,-2.78 -2.78,-2.78 -1.54,0 -2.78,1.24 -2.78,2.78 v -3.73 c 0,-1.54 -1.24,-2.78 -2.78,-2.78 -1.54,0 -2.78,1.24 -2.78,2.78 v -3.20 c 0,-1.54 -1.24,-2.78 -2.78,-2.78 z"
    />
  ),
} satisfies Record<keyof typeof TOOLS, JSX.Element>;
