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

export class TCPPacket {
  source: number;
  destination: number;
  seq: number;
  ack?: number;
  syn: boolean;
  fin: boolean;
  payload: Buffer;

  constructor(
    source: number,
    destination: number,
    seq: number,
    payload: Buffer,
    ack?: number,
    syn = false,
    fin = false,
  ) {
    this.source = source;
    this.destination = destination;
    this.payload = payload;
    this.syn = syn;
    this.fin = fin;
    this.seq = seq;
    this.ack = ack;
  }

  toBytes(): Buffer {
    const buf = Buffer.alloc(this.payload.length + 20);
    buf.writeUInt16BE(this.source);
    buf.writeUInt16BE(this.destination, 2);

    buf.writeUInt32BE(this.seq, 4);
    if (this.ack !== undefined) buf.writeUInt32BE(this.ack, 8);

    buf.writeUInt8(0x50, 12); // DOffset = 5, Reserved = 0

    buf.writeUInt8(
      (+(this.ack !== undefined) << 4) | (+this.syn << 1) | +this.fin,
      13,
    );
    buf.writeUInt16BE(1, 14); // Window = 1

    buf.set(this.payload, 20);
    return buf;
  }

  static fromBytes(bytes: Buffer) {
    if (bytes.length < 20)
      throw `Can't call fromBytes on TCPPacket smaller than 20 bytes (was ${bytes.length})`;
    const dataStart = (bytes.readUInt8(12) >> 4) * 4;
    const flags = bytes.readUInt8(13);
    return new TCPPacket(
      bytes.readUInt16BE(),
      bytes.readUInt16BE(2),
      bytes.readUInt32BE(4),
      bytes.subarray(dataStart, bytes.length),
      flags & 0b10000 ? bytes.readUInt32BE(4) : undefined,
      !!(flags & 0b10),
      !!(flags & 0b1),
    );
  }

  static synPacket(source: number, destination: number) {
    return new TCPPacket(
      source,
      destination,
      0,
      Buffer.alloc(0),
      undefined,
      true,
    );
  }

  static synAckPacket(synPacket: TCPPacket) {
    return new TCPPacket(
      synPacket.destination,
      synPacket.source,
      0,
      Buffer.alloc(0),
      synPacket.seq + 1,
      true,
    );
  }

  static ackPacket(synAckPacket: TCPPacket) {
    if (synAckPacket.ack === undefined)
      throw "TCPPacket.ackPacket() got a synAckPacket withouth ACK set";
    return new TCPPacket(
      synAckPacket.destination,
      synAckPacket.source,
      synAckPacket.ack!,
      Buffer.alloc(0),
      synAckPacket.seq + 1,
    );
  }
}
