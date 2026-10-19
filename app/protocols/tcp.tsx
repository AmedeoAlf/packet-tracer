/*
 * Nota sull'accuratezza:
 *
 * Presenza dei campi dell'header
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Source port                sì | Destination port           sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Sequence number                                            sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Acknowledgement number                                     sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | DOffset | Res.  | Flags  solo | Window                        |
 * |  sì (5) |    no | ACK SYN FIN |                        sì (1) |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Check sum                  no | Urgent pointer             no |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Options                                                    no |
 * | ...                                                           |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *
 * La connessione sarà iniziata sempre con SYN e ACK = 0
 *
 * (per ovvie ragioni di performance non è stato implmentato alcun checksum nel
 * simulatore)
 */

import { PacketSerializer2 } from "./packetEngine2";
import { FillingBufferField } from "./packetEngineFields2/bufferFields";
import {
  U16Field,
  U32Field,
  U4MajorField,
  U4MinorField,
  U8Field,
} from "./packetEngineFields2/numberFields";

export type TCPPacket = {
  source: number;
  destination: number;
  seq?: number;
  ack?: number;
  dataOffset?: number;
  reserved?: number;
  flags?: TCPFlag;
  window?: number;
  checksum?: number;
  urgent?: number;
  payload: Buffer;
};

// NOTE: small regression, data is read without consideration for dataOffset
export const TcpSerializer = new PacketSerializer2([
  U16Field("source"),
  U16Field("destination"),
  U32Field("seq", true),
  U32Field("ack", true, 0),
  U4MajorField("dataOffset", true, 0x5),
  U4MinorField("reserved", true),
  U8Field("flags", true, 0),
  U16Field("window", true, 1),
  U16Field("checksum", true, 0),
  U16Field("urgent", true, 0),
  FillingBufferField("payload"),
]);

export enum TCPFlag {
  fin = 1,
  syn = 1 << 1,
  ack = 1 << 4,
}

export const synPacket = (source: number, destination: number): TCPPacket => ({
  source,
  destination,
  payload: Buffer.alloc(0),
  flags: TCPFlag.syn,
  seq: 0,
});

export const synAckPacket = (synPacket: Required<TCPPacket>): TCPPacket => ({
  destination: synPacket.source,
  source: synPacket.destination,
  payload: Buffer.alloc(0),
  flags: TCPFlag.syn | TCPFlag.ack,
  ack: synPacket.seq + 1,
  seq: 0,
});

export const ackPacket = (synPacket: Required<TCPPacket>): TCPPacket => ({
  destination: synPacket.source,
  source: synPacket.destination,
  payload: Buffer.alloc(0),
  flags: TCPFlag.ack,
  seq: synPacket.ack,
  ack: synPacket.seq + 1,
});
