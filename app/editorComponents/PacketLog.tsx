import { unpacket } from "../emulators/utils/unpacker";
import {
  deviceOfIntf,
  PacketLogEntry,
  ProjectManager,
} from "../ProjectManager";
import { SideBar } from "./reusable/SideBar";

export function PacketLog({
  log,
  devices,
}: {
  log: PacketLogEntry[];
  devices: ProjectManager["immutableDevices"];
}) {
  return (
    <SideBar initialWidth={200} minWidth={200}>
      {!log.length
        ? null
        : log.map((it, idx) => (
            <PacketLogRow key={idx} devices={devices} entry={it} />
          ))}
    </SideBar>
  );
}

function PacketLogRow({
  entry,
  devices,
}: {
  entry: PacketLogEntry;
  devices: ProjectManager["immutableDevices"];
}) {
  const fromDev = devices.get(deviceOfIntf(entry.from));
  const toDev = devices.get(deviceOfIntf(entry.to));
  if (!fromDev || !toDev) return <></>;

  const layers = unpacket(entry.bytes);

  const pad = (n: number, len: number = 2) =>
    Math.floor(n).toString().padStart(len, "0");

  const timestamp = `${pad(entry.tick / 60000)}:${pad(entry.tick / 1000)}.${pad(entry.tick % 1000, 3)}`;
  return (
    <div>
      {timestamp} {entry.bytes.length} bytes from {fromDev.name} to {toDev.name}
      {layers.map((it, idx) => (
        <div key={idx} className="text-xs">
          <span className="font-bold">Layer {idx + 2}</span>
          {Object.entries(it).map(([k, v]) => (
            <p key={k}>
              {k}: {v}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
