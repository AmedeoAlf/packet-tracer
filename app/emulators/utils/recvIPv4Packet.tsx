import { EmulatorContext } from "../DeviceEmulator";
import {
  getMatchingInterface,
  IPv4Packet,
  L3InternalState,
  PartialIPv4Packet,
  ProtocolCode,
} from "@/app/protocols/rfc_760";
import {
  EthernetFrameSerializer,
  EtherType,
  MAC_BROADCAST,
} from "@/app/protocols/802_3";
import { handleArpPacket } from "./handleArpPacket";
import { ARPPacket } from "@/app/protocols/rfc_826";
import {
  echoResponse,
  ICMPPacketSerializer,
  ICMPType,
} from "@/app/protocols/icmp";
import { sendIPv4Packet } from "./sendIPv4Packet";

export function recvIPv4Packet<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  data: Buffer,
  intf: number,
): IPv4Packet | undefined {
  const l2Packet = EthernetFrameSerializer.fromBytes(data);
  if (l2Packet.lenOrEtherType == EtherType.arp) {
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
        l2Packet.src = ctx.state.netInterfaces[intf].mac;
        l2Packet.dst = MAC_BROADCAST;
        ctx.sendOnIf(sendTo, EthernetFrameSerializer.toBuffer(l2Packet));
      }
      return;
    }

    let packet = new PartialIPv4Packet(l2Packet.payload);
    if (!packet.isPayloadFinished()) {
      const packets = ctx.state.ipPackets_t;
      if (!ctx.state.ipPackets_t.has(packet.id)) {
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
      const icmpPacket = ICMPPacketSerializer.fromBytes(packet.payload);
      switch (icmpPacket.type) {
        case ICMPType.echoRequest:
          sendIPv4Packet(
            ctx,
            packet.source,
            ProtocolCode.icmp,
            ICMPPacketSerializer.toBuffer(echoResponse(icmpPacket)),
          );
        default:
          if (ctx.state.rawSocketFd_t)
            ctx.state.rawSocketFd_t(ctx as EmulatorContext<State>, packet);
      }
      return;
    }

    ctx.updateState();
    return packet;
  } catch (e) {
    console.log(e);
  }
}
