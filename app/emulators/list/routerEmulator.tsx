import { ARPPacket } from "@/app/protocols/rfc_826";
import { RouterInternalState } from "../../devices/list/Router";
import { Layer2Packet, MAC_BROADCAST } from "../../protocols/802_3";
import { ICMPPacket, ICMPType } from "../../protocols/icmp";
import {
  getMatchingInterface,
  ipv4ToString,
  L3InternalState,
  PartialIPv4Packet,
  ProtocolCode,
  sendIPv4Packet,
} from "../../protocols/rfc_760";
import { dumpState } from "../../virtualPrograms/dumpstate";
import { hello } from "../../virtualPrograms/hello";
import { interfacesL3 } from "../../virtualPrograms/interfacesl3";
import { l2send } from "../../virtualPrograms/l2send";
import { ping } from "../../virtualPrograms/ping";
import { DeviceEmulator, EmulatorContext } from "../DeviceEmulator";
import { arptable } from "@/app/virtualPrograms/arptable";

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
            {ctx.state.netInterfaces.map((val, idx) => {
              const l3if = ctx.state.l3Ifs.at(idx);
              return (
                <tr key={idx}>
                  <td>{val.name}</td>
                  <td>{val.type}</td>
                  <td>{val.maxMbps} Mbps</td>
                  <td>{l3if ? ipv4ToString(l3if.ip) : "No ip"}</td>
                  <td>{l3if ? ipv4ToString(l3if.mask) : "No mask"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    },
  },
  packetHandler(ctx, data, intf) {
    const l2Packet = Layer2Packet.fromBytes(data);
    if (l2Packet.type() == "arp") {
      handleArpPacket(ctx, ARPPacket.fromL2(l2Packet), intf);
      return;
    }
    try {
      const destination = PartialIPv4Packet.getDestination(l2Packet.payload);
      const isDestinedInterface = ctx.state.l3Ifs.findIndex(
        (v) => v && v.ip == destination,
      );

      // Non è indirizzato a me?
      if (isDestinedInterface == -1) {
        const sendTo = getMatchingInterface(ctx.state.l3Ifs, destination);
        // Devo (posso?) fare routing?
        if (sendTo != -1 && sendTo != intf) {
          l2Packet.from = ctx.state.netInterfaces[intf].mac;
          l2Packet.to = MAC_BROADCAST;
          ctx.sendOnIf(sendTo, l2Packet.toBytes());
        }
        return;
      }

      let packet = new PartialIPv4Packet(l2Packet.payload);
      if (!packet.isPayloadFinished()) {
        const packets = ctx.state.ipPackets;
        if (!ctx.state.ipPackets.has(packet.id)) {
          packets.set(packet.id, packet);
        } else {
          packets.get(packet.id)!.add(l2Packet.payload);
        }
        packet = packets.get(packet.id)!;
        if (!packet.isPayloadFinished()) {
          ctx.updateState();
          return;
        }
        // Il payload è concluso, elimina il pacchetto dalla coda
        packets.delete(packet.id);
      }

      switch (packet.protocol) {
        case ProtocolCode.icmp:
          const icmpPacket = ICMPPacket.fromBytes(packet.payload);
          // Gestisci i pacchetti echo ICMP
          switch (icmpPacket.type) {
            case ICMPType.echoRequest:
              sendIPv4Packet(
                ctx.state,
                ctx.sendOnIf,
                packet.source,
                ProtocolCode.icmp,
                ICMPPacket.echoResponse(icmpPacket).toBytes(),
              );
            default:
              if (ctx.state.rawSocketFd) ctx.state.rawSocketFd(packet);
          }
      }
      ctx.updateState();
    } catch (e) {
      console.log(e);
    }
  },
  cmdInterpreter: {
    shell: {
      desc: "Command",
      subcommands: {
        hello: hello(),
        interfaces: interfacesL3(),
        l2send: l2send(),
        ping: ping(),
        dumpState: dumpState(),
        arptable: arptable(),
      },
    },
  },
};

function handleArpPacket(
  ctx: Pick<
    EmulatorContext<L3InternalState<object>>,
    "state" | "updateState" | "sendOnIf"
  >,
  packet: ARPPacket,
  intf: number,
) {
  if (packet.response) {
    if (
      packet.targetMAC != ctx.state.netInterfaces[intf].mac ||
      packet.targetIP != ctx.state.l3Ifs[intf].ip
    )
      return;
    ctx.state.macTable.set(packet.senderIP, packet.senderMAC);
    ctx.updateState();
    return;
  }

  if (!ctx.state.l3Ifs[intf] || ctx.state.l3Ifs[intf].ip != packet.targetIP)
    return;

  ctx.state.macTable.set(packet.senderIP, packet.senderMAC);
  ctx.sendOnIf(
    intf,
    packet.respondWith(ctx.state.netInterfaces[intf].mac).toL2().toBytes(),
  );
  ctx.updateState();

  return;
}
