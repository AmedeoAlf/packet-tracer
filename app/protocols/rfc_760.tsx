export type IPv4Address = number;
export const IPV4_BROADCAST: IPv4Address = 0xFFFFFFFF;

export const PROTOCOL_CODES = {
  "icmp": 1,
  "tcp": 6,
  "udp": 17
}

export class IPv4Packet {
  ttl: number;
  protocol: keyof typeof PROTOCOL_CODES;
  source: IPv4Address;
  destination: IPv4Address;
  payload: ArrayBufferLike;
  constructor(
    protocol: IPv4Packet['protocol'],
    payload: ArrayBufferLike,
    source: IPv4Address,
    destination: IPv4Address = IPV4_BROADCAST,
    ttl: number = 255
  ) {
    if (payload.byteLength > 65535 - 20) throw "IPv4 packet payload too large";
    this.ttl = ttl;
    this.protocol = protocol;
    this.source = source;
    this.destination = destination;
    this.payload = payload;
  }
  toFragmentedBytes(maxLen: number = 576): Uint8Array[] {
    const header = new Uint8Array(20);
    const view = new DataView(header.buffer);
    // https://en.wikipedia.org/wiki/IPv4#Header
    view.setUint8(0, (4 << 4) | 5); // Version + IHL
    view.setUint8(8, this.ttl);
    view.setUint8(9, PROTOCOL_CODES[this.protocol]);
    view.setUint32(12, this.source);
    view.setUint32(16, this.destination);

    if (this.payload.byteLength + 20 < maxLen) {
      const packet = new Uint8Array(20 + this.payload.byteLength);
      view.setUint16(2, packet.byteLength); // Total length
      packet.set(header);
      packet.set(new Uint8Array(this.payload), 20);
      return [packet];
    }

    view.setUint16(4, Math.floor(Math.random() * (2 ** 16))); // Identification
    const packets = [];
    for (let offs = 0; offs < this.payload.byteLength; offs += ~0x7 & (maxLen - 20)) {
      const moreFragments = this.payload.byteLength - offs > maxLen - 20;
      const packet = new Uint8Array(moreFragments ? maxLen : this.payload.byteLength - offs + 20);
      view.setUint16(2, packet.byteLength); // Total length
      view.setUint16(6,
        (+moreFragments << 29) | // More fragments flag
        offs >> 3 // Fragment offset
      );
      packet.set(header);
      packet.set(new Uint8Array(this.payload.slice(offs, offs + packet.byteLength - 20)), 20);
      packets.push(packet);
    }
    return packets;
  }
  static fromDatagrams(datagrams: ArrayBuffer[]) {
  }
}
