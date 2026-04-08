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
  return Math.floor(2 ** 48 * Math.random());
}

export function MACToString(mac: number): string {
  return Array.from(mac.toString(16).padStart(12, "0")).reduce(
    (acc, char, idx) => acc + (idx % 2 ? "" : ":") + char,
  );
}

export enum EtherType {
  dhcp = 0x0800,
  arp = 0x0806,
}

export class Layer2Packet {
  to: MacAddress;
  from: MacAddress;
  payload: Buffer;
  etherType?: EtherType;
  vlanTag?: number; // https://en.wikipedia.org/wiki/IEEE_802.1Q#Frame_format
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
      packetBuf.writeUInt16BE(Math.floor(mac / 2 ** 32), cursor);
      packetBuf.writeUInt32BE(mac % 0x100000000, cursor + 2);
      cursor += 6;
    };

    writeMac(this.to);
    writeMac(this.from);
    if (this.vlanTag) {
      packetBuf.writeUInt32BE(0x81000000 | (0xfff & this.vlanTag), cursor);
      cursor += 4;
    }
    packetBuf.writeUInt16BE(this.etherType ?? this.payload.byteLength, cursor);
    cursor += 2;
    packetBuf.set(this.payload, cursor);
    return packetBuf;
  }
  static fromBytes(bytes: Buffer): Layer2Packet {
    let cursor = 0;
    const readMac = () => {
      cursor += 6;
      return (
        bytes.readUInt16BE(cursor - 6) * 2 ** 32 +
        bytes.readUInt32BE(cursor - 4)
      );
    };

    const to = readMac();
    const from = readMac();
    let vlanTag = undefined;

    // Check for 802.1Q header
    if (bytes.readUInt16BE(cursor) == 0x8100) {
      vlanTag = bytes.readUInt16BE(cursor + 2) & 0xfff;
      cursor += 4;
    }

    const maybeEtherType = bytes.readUInt16BE(cursor);
    switch (maybeEtherType) {
      case EtherType.arp: {
        cursor += 2;
        const pkt = new Layer2Packet(
          bytes.subarray(cursor, cursor + 28),
          from,
          to,
          vlanTag,
        );
        pkt.etherType = EtherType.arp;
        return pkt;
      }
      case EtherType.dhcp: {
        cursor += 2;
        const pkt = new Layer2Packet(
          // may someone tell me how am I supposed to get the length of a DHCP packet
          // https://en.wikipedia.org/wiki/Dynamic_Host_Configuration_Protocol#Discovery
          bytes.subarray(cursor),
          from,
          to,
          vlanTag,
        );
        pkt.etherType = EtherType.dhcp;
        return pkt;
      }
      default:
        // Otherwise its a packet len
        cursor += 2;
        const payload = bytes.subarray(cursor, cursor + maybeEtherType);
        return new Layer2Packet(payload, from, to, vlanTag);
    }
  }
}
