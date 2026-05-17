import { EthernetFrameSerializer, EtherType } from "@/app/protocols/802_3";
import { ICMPPacketSerializer } from "@/app/protocols/icmp";
import {
  FillingBufferField,
  FixedBufferField,
  PacketSerializer,
} from "@/app/protocols/packetEngine";
import { PartialIPv4Packet, ProtocolCode } from "@/app/protocols/rfc_760";
import { TCPPacket } from "@/app/protocols/tcp";
import { UDPSerializer } from "@/app/protocols/udp";

export function unpacket(packet: Buffer): Record<string, string>[] {
  const layers: Record<string, string>[] = [];
  const l2Pkt = EthernetFrameSerializer.fromBytes(packet);
  layers.push(packetAsRecord(l2Pkt, EthernetFrameSerializer));

  switch (l2Pkt.lenOrEtherType) {
    case EtherType.arp:
      layers.push({ todo: "arp packets not implemented" });
      return layers;
  }
  const l3Pkt = new PartialIPv4Packet(l2Pkt.payload);
  layers.push({ todo: "ipv4 packets not implemented" });

  let l4Payload: Buffer;
  switch (l3Pkt.protocol) {
    case ProtocolCode.icmp:
      layers.push(
        packetAsRecord(
          ICMPPacketSerializer.fromBytes(l3Pkt.rebuiltPayload),
          ICMPPacketSerializer,
        ),
      );
      return layers;
    case ProtocolCode.udp:
      const udpPkt = UDPSerializer.fromBytes(l3Pkt.rebuiltPayload);
      l4Payload = udpPkt.payload;
      layers.push(packetAsRecord(udpPkt, UDPSerializer));
      break;
    case ProtocolCode.tcp:
      const tcpPkt = TCPPacket.fromBytes(l3Pkt.rebuiltPayload);
      l4Payload = tcpPkt.payload;
      layers.push({ todo: "tcp packets not implemented" });
      break;
  }

  return layers;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function packetAsRecord<T extends Record<string, any>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packet: Record<string, any>,
  serializer: PacketSerializer<T>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of serializer.fields) {
    if (f instanceof FixedBufferField || f instanceof FillingBufferField)
      continue;
    if (packet[f.name] != null) out[f.name] = f.stringify(packet[f.name]);
  }
  return out;
}
