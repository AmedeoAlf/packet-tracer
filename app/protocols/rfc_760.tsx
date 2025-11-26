import { InternalState } from "../emulators/DeviceEmulator";

// NOTE: Implementazione parziale, ad esempio IHL è sempre uguale a 5
export type IPv4Address = number;
export const IPV4_BROADCAST: IPv4Address = 0xFFFFFFFF;
export const IPV4_MAX_PAYLOAD = 65535 - 20;

export function ipv4ToString(ip: IPv4Address): string {
  return [
    (ip >> 24) & 0xFF,
    (ip >> 16) & 0xFF,
    (ip >> 8) & 0xFF,
    ip & 0xFF
  ].join(".");
}

export function parseIpv4(s: string): IPv4Address | undefined {
  return s.split(".").slice(0, 4).map(it => +it).reduce((acc, val) => (acc << 8) + val);
}

export type L3Interface = { ip: IPv4Address, mask: IPv4Address };

export function getMatchingInterface(interfaces: L3Interface[], ip: IPv4Address): number {
  return interfaces.findIndex((v) => v && (v.ip & v.mask) == (ip & v.mask))
}

export type L3InternalState<T extends object> = InternalState<T & {
  ipPackets: Map<number, PartialIPv4Packet>,
  l3Ifs: L3Interface[],
  gateway: IPv4Address,
  rawSocketFd?: (packet: IPv4Packet) => void
}>

export enum ProtocolCode {
  "icmp" = 1,
  "tcp" = 6,
  "udp" = 17
}

export class IPv4Packet {
  ttl: number;
  protocol: ProtocolCode;
  source: IPv4Address;
  destination: IPv4Address;
  payload: ArrayBufferLike;
  offset: number;
  constructor(
    protocol: IPv4Packet['protocol'],
    payload: ArrayBufferLike,
    source: IPv4Address,
    destination: IPv4Address = IPV4_BROADCAST,
    ttl: number = 255,
    offset: number = 0
  ) {
    if (payload.byteLength > IPV4_MAX_PAYLOAD) throw "IPv4 packet payload too large";
    if (offset % 8) throw "Offset must be multiple of 8";
    this.ttl = ttl;
    this.protocol = protocol;
    this.source = source;
    this.destination = destination;
    this.payload = payload;
    this.offset = offset;
  }
  toFragmentedBytes(maxLen: number = 576): Uint8Array[] {
    const header = new Uint8Array(20);
    const view = new DataView(header.buffer);
    // https://en.wikipedia.org/wiki/IPv4#Header
    view.setUint8(0, (4 << 4) | 5); // Version + IHL
    view.setUint8(8, this.ttl);
    view.setUint8(9, this.protocol);
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
        (offs + this.offset) >> 3 // Fragment offset
      );
      packet.set(header);
      packet.set(new Uint8Array(this.payload.slice(offs, offs + packet.byteLength - 20)), 20);
      packets.push(packet);
    }
    return packets;
  }
}

export class PartialIPv4Packet extends IPv4Packet {
  id: number = -1;
  slices: [number, number][] = [];
  gotCompleteSize: boolean = false;
  rebuiltPayload: Uint8Array = new Uint8Array(IPV4_MAX_PAYLOAD);

  constructor(first: ArrayBufferLike) {
    const view = new DataView(first);
    // Not an IPv4 packet?
    if (view.getUint8(0) >> 4 != 4) return;

    const offsetAndFlags = view.getUint16(6);
    const morePackets = offsetAndFlags & (1 << 29);
    const offset = offsetAndFlags & ~(0b111 << 29);
    const payloadBuf = new Uint8Array(IPV4_MAX_PAYLOAD);
    payloadBuf.set(new Uint8Array(first.slice(20)), offset << 3);

    super(view.getUint8(9), payloadBuf.buffer, view.getUint32(12), view.getUint32(16), view.getUint8(8));
    this.rebuiltPayload = payloadBuf;
    this.id = view.getUint16(4);
    this.slices.push([offset, offset + first.byteLength - 20]);
    if (!morePackets) {
      this.gotCompleteSize = true
      this.rebuiltPayload = this.rebuiltPayload.slice(0, this.slices[0][1])
      this.payload = this.rebuiltPayload.buffer;
    };
  }

  // assumes many values to be the same
  add(packet: ArrayBufferLike) {
    const view = new DataView(packet);
    // Not an IPv4 packet?
    if (view.getUint8(0) >> 4 != 4) throw "Not an IPv4 Packet";
    if (view.getUint16(4) != this.id) throw "Non-matching ids";

    const offsetAndFlags = view.getUint16(6);
    const morePackets = offsetAndFlags & (1 << 29);
    const offset = offsetAndFlags & ~(0b111 << 29);

    const startEnd = [offset, offset + packet.byteLength - 20] satisfies [number, number];
    if (this.gotCompleteSize && startEnd[1] > this.slices.at(-1)![1]) throw "Packet payload as finished";

    this.rebuiltPayload.set(new Uint8Array(packet.slice(20)), offset << 3);
    this.slices.push(startEnd);
    this.slices.sort((a, b) => a[0] - b[0])
    if (!morePackets) {
      this.gotCompleteSize = true
      this.rebuiltPayload = this.rebuiltPayload.slice(0, this.slices.at(-1)![1])
      this.payload = this.rebuiltPayload.buffer;
    };
  }

  // Il pacchetto è completo?
  isPayloadFinished(): boolean {
    if (!this.gotCompleteSize) return false;
    let firstByteNotPresent = 0;
    for (const s of this.slices) {
      if (s[0] > firstByteNotPresent) return false;
      firstByteNotPresent = s[1];
    }
    return true;
  }

  static getId(packet: ArrayBufferLike): number {
    const view = new DataView(packet);
    if (view.getUint8(0) >> 4 != 4) throw "Not an IPv4 Packet";
    return view.getUint16(4);
  }

  static getDestination(packet: ArrayBufferLike): IPv4Address {
    const view = new DataView(packet);
    if (view.getUint8(0) >> 4 != 4) throw "Not an IPv4 Packet";
    return view.getUint32(16);
  }
}
