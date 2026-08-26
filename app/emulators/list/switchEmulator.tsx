import { EthernetFrameSerializer } from "@/app/protocols/802_3";
import hello from "../../virtualPrograms/hello";
import interfaces from "../../virtualPrograms/interfaces";
import l2send from "../../virtualPrograms/l2send";
import { DeviceEmulator } from "../DeviceEmulator";
import { SwitchInternalState } from "@/app/devices/list/Switch";
import autoMan from "@/app/virtualPrograms/man";
import macTable from "@/app/virtualPrograms/macTable";

export const switchEmulator: DeviceEmulator<SwitchInternalState> = {
  configPanel: {
    interfacce(ctx) {
      return (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Max speed</th>
            </tr>
          </thead>
          <tbody>
            {ctx.state.netInterfaces.map((val, idx) => (
              <tr key={idx}>
                <td>{val.name}</td>
                <td>{val.type}</td>
                <td>{val.maxMbps} Mbps</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    },
  },
  cmdInterpreter: {
    shell: autoMan({
      subcommands: {
        hello: hello(),
        interfaces: interfaces(),
        l2send: l2send(),
        macTable: macTable(),
      },
    }),
  },
  packetHandler(ctx, data, from_intf) {
    const l2Packet = EthernetFrameSerializer.fromBytes(data);
    const myInterface = ctx.state.netInterfaces.findIndex(
      (v) => v.mac == l2Packet.dst,
    );

    if (ctx.state.macTable_t.get(l2Packet.src) != from_intf) {
      ctx.state.macTable_t.set(l2Packet.src, from_intf);
      ctx.updateState();
    }

    // Non facciamo nulla se il pacchetto era destinato all'interfaccia dello switch
    if (myInterface != -1) return;

    const destIntf = ctx.state.macTable_t.get(l2Packet.dst);
    if (destIntf != null) {
      if (destIntf == from_intf) return;
      ctx.sendOnIf(destIntf, data);
    } else
      for (const idx of ctx.state.netInterfaces.keys()) {
        if (idx == from_intf) continue;
        ctx.sendOnIf(idx, data);
      }
  },
};
