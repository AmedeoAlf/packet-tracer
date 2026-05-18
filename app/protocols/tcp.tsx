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

import { PacketSerializer } from "./packetEngine";
import { FillingBufferField } from "./packetEngineFields/bufferFields";
import {
  U16Field,
  U32Field,
  U4MajorField,
  U4MinorField,
  U8Field,
} from "./packetEngineFields/numberFields";

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
export const TcpSerializer = new PacketSerializer<TCPPacket>([
  new U16Field("source"),
  new U16Field("destination"),
  new U32Field("seq"),
  new U32Field("ack", 0),
  new U4MajorField("dataOffset", 0x5),
  new U4MinorField("dataOffset"),
  new U8Field("flags", 0),
  new U16Field("window", 1),
  new U16Field("checksum", 0),
  new U16Field("urgent", 0),
  new FillingBufferField("payload"),
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
