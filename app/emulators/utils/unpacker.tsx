import { EthernetFrameSerializer, EtherType } from "@/app/protocols/802_3";
import { ICMPPacketSerializer } from "@/app/protocols/icmp";
import {
  Field2,
  fieldGet,
  fieldName,
  fieldVtable,
  PacketSerializer2,
  SerializerT,
} from "@/app/protocols/packetEngine2";
import {
  FixedBufferField,
  FillingBufferField,
} from "@/app/protocols/packetEngineFields2/bufferFields";
import { Ipv4Serializer, ProtocolCode } from "@/app/protocols/rfc_760";
import { ArpSerializer } from "@/app/protocols/rfc_826";
import { TcpSerializer } from "@/app/protocols/tcp";
import { UDPSerializer } from "@/app/protocols/udp";

export function unpacket(packet: Buffer): Record<string, string>[] {
  const layers: Record<string, string>[] = [];
  const l2Pkt = EthernetFrameSerializer.fromBytes(packet);

  layers.push(packetAsRecord(l2Pkt, EthernetFrameSerializer));

  switch (l2Pkt.lenOrEtherType) {
    case EtherType.arp:
      layers.push(
        packetAsRecord(ArpSerializer.fromBytes(l2Pkt.payload), ArpSerializer),
      );
      return layers;
  }
  try {
    const l3Pkt = Ipv4Serializer.fromBytes(l2Pkt.payload);
    layers.push(packetAsRecord(l3Pkt, Ipv4Serializer));

    const serializer = {
      [ProtocolCode.icmp]: ICMPPacketSerializer,
      [ProtocolCode.tcp]: TcpSerializer,
      [ProtocolCode.udp]: UDPSerializer,
    }[l3Pkt.protocol]!;

    layers.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      packetAsRecord(serializer.fromBytes(l3Pkt.payload), serializer as any),
    );
  } catch {
    layers.push({ "unkown payload": "0x" + l2Pkt.payload.toString("hex") });
  }
  return layers;
}

function packetAsRecord<Fields extends readonly Field2<unknown, string>[]>(
  packet: SerializerT<PacketSerializer2<Fields>>,
  serializer: PacketSerializer2<Fields>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of serializer.fields) {
    if (f instanceof FixedBufferField || f instanceof FillingBufferField)
      continue;
    if (fieldGet(packet, f) == null)
      out[fieldName(f)] = fieldVtable(f).stringify(
        fieldGet(packet, f) ?? undefined,
      );
  }
  return out;
}

export function quickAnalysis(packet: Buffer): string {
  const l2Pkt = EthernetFrameSerializer.fromBytes(packet);
  switch (l2Pkt.lenOrEtherType) {
    case EtherType.arp:
      return "arp";
    case EtherType.dhcp:
      return "dhcp";
  }

  try {
    const l3Pkt = Ipv4Serializer.fromBytes(l2Pkt.payload);
    switch (l3Pkt.protocol) {
      case ProtocolCode.icmp:
        return "icmp";
      case ProtocolCode.tcp:
        const tcpPkt = TcpSerializer.fromBytes(l3Pkt.payload);
        return `tcp (${tcpPkt.source}->${tcpPkt.destination})`;
      case ProtocolCode.udp:
        const udpPkt = UDPSerializer.fromBytes(l3Pkt.payload);
        return `udp (${udpPkt.source}->${udpPkt.destination})`;
      default:
        return `unknown ip (protocol ${l3Pkt.protocol})`;
    }
  } catch {
    return `eth frame (unknown payload)`;
  }
}
