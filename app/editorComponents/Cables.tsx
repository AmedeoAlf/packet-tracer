import { memo, ReactNode } from "react";
import { Project } from "../Project";
import { NetworkInterface } from "../emulators/DeviceEmulator";
import { ProjectManager } from "../ProjectManager";
import { Device } from "../devices/Device";
import { MapRecord } from "../common";

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
      {[
        ...cables.entries().map(([fromTo, cables]) => {
          const a = devices.get(fromTo >> 16)!;
          const b = devices.get(fromTo & 0xffff)!;

          const dx = a.pos[0] - b.pos[0];
          const dy = a.pos[1] - b.pos[1];
          const cableLen = Math.sqrt(dx * dx + dy * dy);

          const shared = {
            dx,
            dy,
            cableLen,
            cables,
          };

          // C'è un solo cavo tra due dispositivi, caso facile
          return (
            <g key={fromTo}>
              <Label device={a} idxOfIntfOfCable={0} shared={shared} />
              <Label device={b} idxOfIntfOfCable={1} shared={shared} />
            </g>
          );
        }),
      ]}
    </g>
  );
});

export const intfColor = {
  copper: "black",
  serial: "orange",
  fiber: "red",
} satisfies Record<NetworkInterface["type"], string>;

const Label = memo(
  function Label({
    device,
    shared,
    idxOfIntfOfCable: idx,
  }: {
    device: Device;
    idxOfIntfOfCable: number;
    shared: {
      cables: MapRecord<ReturnType<ProjectManager["getCables"]>>;
      cableLen: number;
      dx: number;
      dy: number;
    };
  }) {
    const text =
      device.internalState.netInterfaces[shared.cables[0].intf[idx]].name +
      (shared.cables.length > 1 ? "+" : "");
    const len = ((idx == 0 ? -1 : 1) * shared.cableLen) / 45;
    return (
      <foreignObject
        x={device.pos[0] + shared.dx / len - 15}
        y={device.pos[1] + shared.dy / len}
        width={35}
        height={20}
      >
        <div className="w-full text-sm text-center bg-slate-800/70 rounded-sm truncate">
          {text}
        </div>
      </foreignObject>
    );
  },
  (p, n) =>
    p.device === n.device &&
    p.idxOfIntfOfCable === n.idxOfIntfOfCable &&
    p.shared.dx === n.shared.dx &&
    p.shared.dy === n.shared.dy,
);
