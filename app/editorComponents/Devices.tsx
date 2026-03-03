import { memo } from "react";
import { Project } from "../Project";
import { Device } from "../devices/Device";
import { Tool } from "../tools/Tool";
import {
  isDeviceHighlighted,
  isSelectTool,
  SelectTool,
} from "../tools/SelectTool";

// Utility function che disegna i dispositivi del progetto, opzionalmente
// evidenziandoli
export const Devices = memo(
  function Devices({
    devices,
    tool,
  }: {
    devices: Project["devices"];
    tool: Tool<object> | SelectTool;
  }) {
    const highlighted = isSelectTool(tool)
      ? isDeviceHighlighted.bind(null, tool)
      : undefined;
    return (
      <g>
        {[
          ...devices
            .values()
            .map(
              highlighted
                ? (d) => (
                    <DeviceComponent
                      device={d}
                      key={d.id}
                      extraClass={
                        highlighted && highlighted(d)
                          ? " brightness-50"
                          : undefined
                      }
                    />
                  )
                : (d) => <DeviceComponent device={d} key={d.id} />,
            ),
        ]}
      </g>
    );
  },
  (p, n) =>
    p.devices === n.devices &&
    (p.tool === n.tool || (!isSelectTool(p.tool) && !isSelectTool(n.tool))),
);

// Componente che ritorna un dispositivo come SVG, cliccando sopra il
// dispositivo si può ricavare l'id tramite la proprietà "data-id"
// dell'elemento. L'icona è data dalla factory del `deviceType` del dispositivo
// stesso
const DeviceComponent = memo(function DeviceComponent({
  device,
  extraClass,
}: {
  device: Device;
  extraClass?: string;
}) {
  const dataProps = { "data-id": device.id };
  return (
    <>
      <use
        href={device.iconId}
        className={"device " + (extraClass || "")}
        x={device.pos[0]}
        y={device.pos[1]}
        {...dataProps}
      />
      <text
        x={device.pos[0]}
        y={device.pos[1] + 40}
        width="100px"
        textAnchor="middle"
        fill="#ffffff"
        {...dataProps}
      >
        {device.name}
      </text>
    </>
  );
});
