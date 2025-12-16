/*
 * Nota sull'accuratezza:
 *
 * Presenza dei campi dell'header
 * +----------+-----+-----+-----+-------------------+-----+---------+-----+-----+
 * | Preamble | SFD | dst | src | 802.1Q tag (opt.) | len | payload | CRC | IPG |
 * +----------+-----+-----+-----+-------------------+-----+---------+-----+-----+
 * | no (perché L1) | sì  | sì  | si (opzionalmente)| sì  | sì      | no  | L1  |
 * +----------------+-----+-----+-------------------+-----+---------+-----+-----+
 * (per ovvie ragioni di performance non è stato implmentato alcun checksum nel
 * simulatore)
 */

export type MacAddress = number;

export const MAC_BROADCAST: MacAddress = 0xffffffffffff;

export function randomMAC(): number {
  return 2 ** 48 * Math.random();
}

export class Layer2Packet {
  to: MacAddress;
  from: MacAddress;
  vlanTag?: number; // https://en.wikipedia.org/wiki/IEEE_802.1Q#Frame_format
  payload: Buffer;
  _arpPacket: boolean = false;
  constructor(
    payload: Buffer,
    from: MacAddress,
    to: MacAddress = MAC_BROADCAST,
    vlanTag?: number,
  ) {
    if (payload.byteLength > 1500) throw "Payload required bigger than MTU";
    this.payload = payload;
    this.from = from;
    this.to = to;
    this.vlanTag = vlanTag;
  }
  toBytes(): Buffer {
    const packetBuf = Buffer.alloc(1522);
    let cursor = 0;
    const writeMac = (mac: number) => {
      packetBuf.writeUint16BE(mac / 2 ** 32, cursor);
      packetBuf.writeUint32BE(mac, cursor + 2);
      cursor += 6;
    };

    writeMac(this.to);
    writeMac(this.from);
    if (this.vlanTag) {
      packetBuf.writeUint32BE(0x81000000 | (0xfff & this.vlanTag), cursor);
      cursor += 4;
    }
    packetBuf.writeUint16BE(
      this._arpPacket ? 0x0806 : this.payload.byteLength,
      cursor,
    );
    cursor += 2;
    packetBuf.set(this.payload, cursor);
    return packetBuf;
  }
  static fromBytes(bytes: Buffer): Layer2Packet {
    let cursor = 0;
    const readMac = () => {
      cursor += 6;
      return (
        bytes.readUint16BE(cursor - 6) * 2 ** 32 +
        bytes.readUint32BE(cursor - 4)
      );
    };

    const to = readMac();
    const from = readMac();
    let vlanTag = undefined;
    if (bytes.readUInt16BE(cursor) == 0x8100) {
      vlanTag = bytes.readUInt16BE(cursor + 2) & 0xfff;
      cursor += 4;
    }
    if (bytes.readUint16BE(cursor) == 0x0806) {
      // ARP packet
      cursor += 2;
      const pkt = new Layer2Packet(
        bytes.subarray(cursor, cursor + 28),
        from,
        to,
        vlanTag,
      );
      pkt._arpPacket = true;
      return pkt;
    }
    const len = bytes.readUInt16BE(cursor);
    cursor += 2;
    const payload = bytes.subarray(cursor, cursor + len);
    return new Layer2Packet(payload, from, to, vlanTag);
  }
}
