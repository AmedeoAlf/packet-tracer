import { InterfaceId } from "../Project";
import {
  deviceOfIntf,
  PacketLogEntry,
  ProjectManager,
} from "../ProjectManager";
import { SideBar } from "./SideBar";

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
  return (
    <div>
      {entry.bytes.length} bytes from {fromDev.name} to {toDev.name}
    </div>
  );
}
