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
  OptionalField2,
  PacketSerializer2,
  SerializerT,
} from "./packetEngine2";
import IPv4Field from "./packetEngineFields2/IPv4Field";
import MACField from "./packetEngineFields2/MacField";
import { U16Field, U8Field } from "./packetEngineFields2/numberFields";

export enum Operation {
  request = 1,
  reply = 2,
}

export type ARPPacket = SerializerT<typeof ArpSerializer>;

export const ArpSerializer = new PacketSerializer2([
  U16Field("hardwareType", true, 1),
  U16Field("protocolType", true, 0x800),
  U8Field("hwLen", true, 6),
  U8Field("protoLen", true, 4),
  U8Field("operation", true, Operation.request) as OptionalField2<
    Operation,
    "operation"
  >,
  MACField("senderMAC"),
  IPv4Field("senderIP"),
  MACField("targetMAC", true, 0),
  IPv4Field("targetIP"),
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
