import { EmulatorContext } from "../DeviceEmulator";
import {
  getDestinationOf,
  getMatchingInterface,
  IPv4Packet,
  IPv4PacketAssembler,
  Ipv4Serializer,
  L3InternalState,
  ProtocolCode,
} from "@/app/protocols/rfc_760";
import {
  EthernetFrame,
  EthernetFrameSerializer,
  EtherType,
  MAC_BROADCAST,
} from "@/app/protocols/802_3";
import { handleArpPacket } from "./handleArpPacket";
import { ArpSerializer } from "@/app/protocols/rfc_826";
import {
  echoResponse,
  ICMPPacketSerializer,
  ICMPType,
} from "@/app/protocols/icmp";
import { sendIPv4Packet } from "./sendIPv4Packet";

export function recvIPv4Packet<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  l2Packet: EthernetFrame,
  intf: number,
): IPv4Packet | undefined {
  if (l2Packet.lenOrEtherType == EtherType.arp) {
    handleArpPacket(ctx, ArpSerializer.fromBytes(l2Packet.payload), intf);
    return;
  }
  try {
    const destination = getDestinationOf(l2Packet.payload);
    const isDestinedInterface =
      ctx.state.netInterfaces[intf].type == "localhost" ||
      ctx.state.l3Ifs.findIndex((v) => v && v.ip == destination) != -1;

    // Non è indirizzato a me?
    if (!isDestinedInterface) {
      const sendTo = getMatchingInterface(ctx.state.l3Ifs, destination);
      // Devo (posso?) fare routing?
      if (sendTo != -1 && sendTo != intf) {
        l2Packet.src = ctx.state.netInterfaces[intf].mac;
        l2Packet.dst = MAC_BROADCAST;
        ctx.sendOnIf(sendTo, EthernetFrameSerializer.toBuffer(l2Packet));
      }
      return;
    }

    let packet = Ipv4Serializer.fromBytes(l2Packet.payload);
    let assembler = new IPv4PacketAssembler(packet);
    if (!assembler.getOriginal()) {
      const packets = ctx.state.ipPackets_t;
      const id = packet.identification;
      if (!packets.has(id)) {
        packets.set(id, assembler);
      } else {
        packets.get(id)!.add(packet);
      }
      assembler = packets.get(id)!;
      if (!assembler.getOriginal()) {
        ctx.updateState();
        return;
      }
      // Il payload è concluso, elimina il pacchetto dalla coda
      packets.delete(id);
    }

    packet = assembler.getOriginal()!;

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
