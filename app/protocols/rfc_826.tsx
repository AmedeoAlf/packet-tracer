/*
 * Nota sull'accuratezza:
 *
 * Presenza dei campi dell'header
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Hardware type          sì (1) | Protocol type     sì (0x0800) |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Hardware len  | Protocol len  | Operation                     |
 * |        sì (6) |        sì (4) |                            sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Sender HW address                                             |
 * +                               +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                            sì | Sender proto address         >|
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |>                           sì | Target proto address          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
 * |                                                            sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Target proto address                                       sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * (per ovvie ragioni di performance non è stato implmentato alcun checksum nel
 * simulatore)
 */

import { EtherType, EthernetFrame, MAC_BROADCAST, MacAddress } from "./802_3";
import {
  IPv4Field,
  MACField,
  PacketSerializer,
  U16Field,
  U8Field,
} from "./packetEngine";
import { IPv4Address } from "./rfc_760";

export enum Operation {
  request = 1,
  reply = 2,
}

export type ARPPacket = {
  hardwareType?: number;
  protocolType?: number;
  hwLen?: number;
  protoLen?: number;
  operation?: Operation;
  senderMAC: MacAddress;
  senderIP: IPv4Address;
  targetMAC?: MacAddress;
  targetIP: IPv4Address;
};

export const ArpSerializer = new PacketSerializer<ARPPacket>([
  new U16Field("hardwareType", 1),
  new U16Field("protocolType", 0x800),
  new U8Field("hwLen", 6),
  new U8Field("protoLen", 4),
  new U8Field("operation", Operation.request),
  new MACField("senderMAC"),
  new IPv4Field("senderIP"),
  new MACField("targetMAC", 0),
  new IPv4Field("targetIP"),
]);

export function arpToL2(packet: ARPPacket): EthernetFrame {
  return {
    payload: ArpSerializer.toBuffer(packet),
    src: packet.senderMAC,
    dst: packet.targetMAC || MAC_BROADCAST,
    lenOrEtherType: EtherType.arp,
  };
}

// TODO: remove
//
// export function arpFromL2(packet: EthernetFrame): ARPPacket {
//   if (packet.lenOrEtherType != EtherType.arp)
//     throwString("Tried to parse an arp packet from a non-arp ethernetframe");
//   return ArpSerializer.fromBytes(packet.payload);
// }
//
export function respondTo(packet: ARPPacket, myMAC: MacAddress): ARPPacket {
  if (packet.operation == Operation.reply)
    throw "Tried to respond to ARP reply";
  return {
    senderMAC: myMAC,
    targetMAC: packet.senderMAC,
    targetIP: packet.senderIP,
    senderIP: packet.targetIP,
    operation: Operation.reply,
  };
}
