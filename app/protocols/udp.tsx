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

import { FieldBuilder, PacketSerializer2 } from "./packetEngine2";
import { FillingBufferField } from "./packetEngineFields2/bufferFields";
import { U16Field } from "./packetEngineFields2/numberFields";

// export type UDPPacket = {
//   source: number;
//   destination: number;
//   length?: number;
//   checksum?: number;
//   payload: Buffer;
// };

export type UDPPacket = FieldBuilder<typeof fields>;

const fields = [
  U16Field("source"),
  U16Field("destination"),
  U16Field("length", true, 0),
  U16Field("checksum", true, 0),
  FillingBufferField("payload"),
] as const;

export const UDPSerializer =
  new (class UDPPacketSerializerConstructor extends PacketSerializer2<
    typeof fields
  > {
    protected beforeToBytes(value: UDPPacket): void {
      value.length = value.payload.length + 8;
    }
    protected afterFromBytes(_: Buffer, value: UDPPacket): void {
      value.length = value.length ?? 0 - 8;
    }
  })(fields);
