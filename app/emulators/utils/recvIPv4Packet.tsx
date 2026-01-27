import { OSInternalState } from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import {
  getMatchingInterface,
  IPv4Packet,
  PartialIPv4Packet,
  ProtocolCode,
} from "@/app/protocols/rfc_760";
import { Layer2Packet, MAC_BROADCAST } from "@/app/protocols/802_3";
import { handleArpPacket } from "./handleArpPacket";
import { ARPPacket } from "@/app/protocols/rfc_826";
import { ICMPPacket, ICMPType } from "@/app/protocols/icmp";
import { sendIPv4Packet } from "./sendIPv4Packet";

export function recvIPv4Packet(
  ctx: EmulatorContext<OSInternalState>,
  data: Buffer,
  intf: number,
): IPv4Packet | undefined {
  const l2Packet = Layer2Packet.fromBytes(data);
  if (l2Packet.type() == "arp") {
    handleArpPacket(ctx as any, ARPPacket.fromL2(l2Packet), intf);
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

    // Gestisci i pacchetti echo ICMP
    if (packet.protocol == ProtocolCode.icmp) {
      const icmpPacket = ICMPPacket.fromBytes(packet.payload);
      switch (icmpPacket.type) {
        case ICMPType.echoRequest:
          sendIPv4Packet(
            ctx as any,
            packet.source,
            ProtocolCode.icmp,
            ICMPPacket.echoResponse(icmpPacket).toBytes(),
          );
        default:
          if (ctx.state.rawSocketFd) ctx.state.rawSocketFd(ctx, packet);
      }
      return;
    }

    ctx.updateState();
    return packet;
  } catch (e) {
    console.log(e);
  }
}
