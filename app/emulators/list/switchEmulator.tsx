import { EthernetFrameSerializer } from "@/app/protocols/802_3";
import { hello } from "../../virtualPrograms/hello";
import { interfaces } from "../../virtualPrograms/interfaces";
import { l2send } from "../../virtualPrograms/l2send";
import { DeviceEmulator } from "../DeviceEmulator";
import { SwitchInternalState } from "@/app/devices/list/Switch";

export const switchEmulator: DeviceEmulator<SwitchInternalState> = {
  configPanel: {
    "pannello meme"() {
      return (
        <p>
          Questo pannello serve solo a dimostrare che gli switch hanno un
          pannello differente dai router
        </p>
      );
    },
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
    shell: {
      subcommands: {
        hello: hello(),
        interfaces: interfaces(),
        l2send: l2send(),
      },
    },
  },
  packetHandler(ctx, data, from_intf) {
    const l2Packet = EthernetFrameSerializer.fromBytes(data);
    const myInterface = ctx.state.netInterfaces.findIndex(
      (v) => v.mac == l2Packet.dst,
    );
    // Non facciamo nulla se il pacchetto era destinato all'interfaccia dello switch

    if (myInterface == -1) {
      for (const idx of ctx.state.netInterfaces.keys()) {
        if (idx == from_intf) continue;
        ctx.sendOnIf(idx, data);
      }
    }
  },
};
