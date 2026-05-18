import { useState } from "react";
import { quickAnalysis, unpacket } from "../emulators/utils/unpacker";
import {
  deviceOfIntf,
  PacketLogEntry,
  ProjectManager,
} from "../ProjectManager";
import { SideBar } from "./reusable/SideBar";
import { InterfaceId } from "../Project";
import { Button } from "./reusable/RoundBtn";

export function PacketLog({
  log,
  devices,
}: {
  log: PacketLogEntry[];
  devices: ProjectManager["immutableDevices"];
}) {
  const [selected, setSelected] = useState<PacketLogEntry | null>(null);
  const nameOf = intfIdToString.bind(null, devices);
  return (
    <SideBar initialWidth={200} minWidth={200}>
      {!log.length ? null : selected ? (
        <EntryDisplay
          entry={selected}
          nameOfFn={nameOf}
          back={() => setSelected(null)}
        />
      ) : (
        <table className="min-w-max text-center">
          <thead>
            <tr>
              <th>Time</th>
              <th>Tipo</th>
              <th>Byte</th>
              <th>Da</th>
              <th>A</th>
            </tr>
          </thead>
          <tbody>
            {log
              .toReversed()
              .slice(0, 10)
              .map((it, idx) => (
                <LogRow
                  key={idx}
                  nameOfFn={nameOf}
                  entry={it}
                  onClick={() => setSelected(it)}
                />
              ))}
          </tbody>
        </table>
      )}
    </SideBar>
  );
}

function LogRow({
  entry,
  nameOfFn,
  onClick,
}: {
  entry: PacketLogEntry;
  nameOfFn: (i: InterfaceId) => string;
  onClick: () => void;
}) {
  const fromDev = nameOfFn(entry.from);
  const toDev = nameOfFn(entry.to);

  const timestamp = `${pad(entry.tick / 60000)}:${pad((entry.tick / 1000) % 60)}.${pad(entry.tick % 1000, 3)}`;
  return (
    <tr onClick={onClick}>
      <td>{timestamp}</td>
      <td>{quickAnalysis(entry.bytes)}</td>
      <td>{entry.bytes.length}</td>
      <td>{fromDev}</td>
      <td>{toDev}</td>
    </tr>
  );
}

function EntryDisplay({
  entry,
  nameOfFn,
  back,
}: {
  entry: PacketLogEntry;
  nameOfFn: (i: InterfaceId) => string;
  back: () => void;
}) {
  const fromDev = nameOfFn(entry.from);
  const toDev = nameOfFn(entry.to);

  const layers = unpacket(entry.bytes);

  const pad = (n: number, len: number = 2) =>
    Math.floor(n).toString().padStart(len, "0");

  const timestamp = `${pad(entry.tick / 60000)}:${pad(entry.tick / 1000)}.${pad(entry.tick % 1000, 3)}`;
  return (
    <div>
      <Button onClick={back} className="bg-onsidebar">
        Indietro
      </Button>
      <p>{timestamp}</p>
      <p>
        {fromDev} {"->"} {toDev}
      </p>
      <p>{entry.bytes.length} bytes </p>
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

const pad = (n: number, len: number = 2) =>
  Math.floor(n).toString().padStart(len, "0");

function intfIdToString(
  devices: ProjectManager["immutableDevices"],
  intf: InterfaceId,
) {
  const devId = deviceOfIntf(intf);
  const dev = devices.get(deviceOfIntf(intf));
  return dev?.name ?? `<eliminato (${devId})>`;
}
