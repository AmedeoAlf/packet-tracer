/*
 * Nota sull'accuratezza:
 *
 * Presenza dei campi dell'header
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Source port                sì | Destination port           sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Length                     sì | Checksum                   no |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *
 * (per ovvie ragioni di performance non è stato implmentato alcun checksum nel
 * simulatore)
 */

import { FillingBufferField, PacketSerializer, U16Field } from "./packetEngine";

export type UDPPacket = {
  source: number;
  destination: number;
  length?: number;
  checksum?: number;
  payload: Buffer;
};

class UDPPacketSerializerConstructor extends PacketSerializer<UDPPacket> {
  constructor() {
    super([
      new U16Field("source"),
      new U16Field("destination"),
      new U16Field("length", 0),
      new U16Field("checksum", 0),
      new FillingBufferField("payload"),
    ]);
  }

  beforeToBytes(value: UDPPacket): void {
    value.length = value.payload.length + 8;
  }
  afterFromBytes(_: Buffer, value: UDPPacket): void {
    value.length = value.length ?? 0 - 8;
  }
}

export const UDPSerializer = new UDPPacketSerializerConstructor();
