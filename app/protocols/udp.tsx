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

export class UDPPacket {
  source: number;
  destination: number;
  payload: Buffer;

  constructor(source: number, destination: number, payload: Buffer) {
    this.source = source;
    this.destination = destination;
    this.payload = payload;
  }

  toBytes(): Buffer {
    const buf = Buffer.alloc(this.payload.length + 8);
    buf.writeUInt16BE(this.source);
    buf.writeUInt16BE(this.destination, 2);
    buf.writeUInt16BE(this.payload.length + 8, 4);
    buf.set(this.payload, 8);
    return buf;
  }

  static fromBytes(bytes: Buffer) {
    if (bytes.length < 8)
      throw `Can't call fromBytes on UDPPacket smaller than 8 bytes (was ${bytes.length})`;
    const packetLen = bytes.readUInt16BE(4);
    if (packetLen > bytes.length)
      throw `Can't call fromBytes on UDPPacket smaller its declared size (${bytes.length} vs. ${packetLen})`;
    return new UDPPacket(
      bytes.readUInt16BE(),
      bytes.readUInt16BE(2),
      bytes.subarray(8, packetLen),
    );
  }
}
