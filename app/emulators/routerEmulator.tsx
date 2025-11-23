import { RouterInternalState } from "../devices/Router";
import { Layer2Packet, MAC_BROADCAST } from "../protocols/802_3";
import { getMatchingInterface, ipv4ToString, PartialIPv4Packet } from "../protocols/rfc_760";
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
    const l2Packet = Layer2Packet.fromBytes(new Uint8Array(data).buffer);
    try {
      const destination = PartialIPv4Packet.getDestination(l2Packet.payload.buffer);
      const isDestinedInterface = ctx.state.l3Ifs.findIndex(v => v.ip == destination);

      // Non è indirizzato a me?
      if (isDestinedInterface == -1) {
        const sendTo = getMatchingInterface(ctx.state.l3Ifs, destination);
        // Devo (posso?) fare routing?
        if (sendTo != -1 && sendTo != intf) {
          l2Packet.from = ctx.state.netInterfaces[intf].mac;
          l2Packet.to = MAC_BROADCAST;
          ctx.sendOnIf(sendTo, l2Packet.toBytes());
        }
      } else {
        const packetId = PartialIPv4Packet.getId(l2Packet.payload.buffer);
        const packets = ctx.state.ipPackets;
        if (!ctx.state.ipPackets.has(packetId)) {
          packets.set(packetId, new PartialIPv4Packet(l2Packet.payload.buffer));
        } else {
          packets.get(packetId)!!.add(l2Packet.payload.buffer);
        }

        const packet = packets.get(packetId)!!;;
        if (packet.isPayloadFinished()) {
          console.log("Got packet on if:", intf);
          console.log(packet)
          packets.delete(packetId);
        }
      }
      ctx.updateState();

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

