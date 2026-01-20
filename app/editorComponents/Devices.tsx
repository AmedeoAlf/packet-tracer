import { memo } from "react";
import { Project } from "../Project";
import { Device } from "../devices/Device";

// Utility function che disegna i dispositivi del progetto, opzionalmente
// evidenziandoli
export const Devices = memo(function Devices({
  devices,
  highlighted,
}: {
  devices: Project["devices"];
  highlighted?: (d: Device) => boolean;
}) {
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
                    extraClass={highlighted(d) ? " brightness-50" : undefined}
                  />
                )
              : (d) => <DeviceComponent device={d} key={d.id} />,
          ),
      ]}
    </g>
  );
});

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
        {...device.pos}
        {...dataProps}
      />
      <text
        x={device.pos.x}
        y={device.pos.y + 40}
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
