import { memo, ReactNode } from "react";
import { Project } from "../Project";
import { NetworkInterface } from "../emulators/DeviceEmulator";
import { ProjectManager } from "../ProjectManager";

export const Cables = memo(function Cables({
  cables,
  devices,
}: {
  cables: ReturnType<ProjectManager["getCables"]>;
  devices: Project["devices"];
}): ReactNode {
  return (
    <g>
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
                  x1: aPos[0],
                  x2: bPos[0],
                  y1: aPos[1],
                  y2: bPos[1],
                  stroke: intfColor[cables[0].type],
                },
              ];
            }

            // Altrimenti disegnali con offset corretti
            const dx = bPos[0] - aPos[0];
            const dy = bPos[1] - aPos[1];
            const len = Math.sqrt(dx * dx + dy * dy);
            const CABLE_DIAMETER = Math.min(cables.length * 3 + 5, 20);
            const height = (dx / len) * CABLE_DIAMETER;
            const width = (dy / len) * CABLE_DIAMETER;

            return cables.map((c, i) => {
              const t = i / (cables.length - 1) - 0.5;
              return {
                x1: aPos[0] - width * t,
                x2: bPos[0] - width * t,
                y1: aPos[1] + height * t,
                y2: bPos[1] + height * t,
                stroke: intfColor[c.type],
              };
            });
          })
          .map((props, idx) => <line {...props} key={idx} strokeWidth="1pt" />),
      ]}
    </g>
  );
});

export const intfColor = {
  copper: "black",
  serial: "orange",
  fiber: "red",
} satisfies Record<NetworkInterface["type"], string>;
