import { RouterInternalState } from "../devices/Router";
import { Layer2Packet, MAC_BROADCAST } from "../protocols/802_3";
import { ipv4ToString, PartialIPv4Packet } from "../protocols/rfc_760";
import { hello } from "../virtualPrograms/hello";
import { interfaces } from "../virtualPrograms/interfaces";
import { l2send } from "../virtualPrograms/l2send";
import { DeviceEmulator } from "./DeviceEmulator";

export const routerEmulator: DeviceEmulator<RouterInternalState> = {
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
            {ctx.state.netInterfaces.map((val, idx) =>
              <tr key={idx}>
                <td>{val.name}</td>
                <td>{val.type}</td>
                <td>{val.maxMbps} Mbps</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    },
  },
  packetHandler(ctx, data, intf) {
    const recved = Layer2Packet.fromBytes(new Uint8Array(data).buffer);
    // NOTE: Non è veramente necessario ricomporre un pacchetto per reinviarlo
    try {
      const p = PartialIPv4Packet.getId(recved.payload.buffer);
      const packets = ctx.state.ip_packets;
      if (!ctx.state.ip_packets.has(p)) {
        packets.set(p, new PartialIPv4Packet(recved.payload.buffer));
      } else {
        packets.get(p)!!.add(recved.payload.buffer);
      }
      if (packets.get(p)!!.isPayloadFinished()) {
        console.log("Got packet for", ipv4ToString(packets.get(p)!!.destination), "on interface", intf);
      }
    } catch (_) { }
  },
  cmdInterpreter: {
    shell: {
      desc: "Command",
      subcommands: ({
        hello,
        interfaces,
        l2send
      } as any)
    }
  }
};

