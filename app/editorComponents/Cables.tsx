import { memo, ReactNode } from "react";
import { Project } from "../Project";
import { NetworkInterface } from "../emulators/DeviceEmulator";

export const Cables = memo(function Cables({
  cables,
  devices,
}: {
  cables: ReturnType<Project["getCables"]>;
  devices: Project["devices"];
}): ReactNode {
  return (
    <g>
      {" "}
      {[
        ...cables
          .entries()
          .flatMap(([fromTo, cables]) => {
            const aPos = devices.get(fromTo >> 16)!.pos;
            const bPos = devices.get(fromTo & 0xffff)!.pos;

            // C'è un solo cavo tra due dispositivi, caso facile
            if (cables.length == 1) {
              return [
                {
                  x1: aPos.x,
                  x2: bPos.x,
                  y1: aPos.y,
                  y2: bPos.y,
                  stroke: intfColor[cables[0].type],
                },
              ];
            }

            // Altrimenti disegnali con offset corretti
            const dx = bPos.x - aPos.x;
            const dy = bPos.y - aPos.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const CABLE_DIAMETER = Math.min(cables.length * 3 + 5, 20);
            const height = (dx / len) * CABLE_DIAMETER;
            const width = (dy / len) * CABLE_DIAMETER;

            return cables.map((c, i) => {
              const t = i / (cables.length - 1) - 0.5;
              return {
                x1: aPos.x - width * t,
                x2: bPos.x - width * t,
                y1: aPos.y + height * t,
                y2: bPos.y + height * t,
                stroke: intfColor[c.type],
              };
            });
          })
          .map((props, idx) => <line {...props} key={idx} strokeWidth="1pt" />),
      ]}{" "}
    </g>
  );
});

const intfColor = {
  copper: "black",
  serial: "orange",
  fiber: "red",
} satisfies Record<NetworkInterface["type"], string>;
