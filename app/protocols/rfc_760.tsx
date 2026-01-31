/*
 * Nota sull'accuratezza:
 *
 * Presenza dei campi dell'header
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |Version|  IHL  |Type of Service|          Total Length         |
 * | sì    | si    | vuoto         | sì                            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |         Identification        |Flags|      Fragment Offset    |
 * | sì                            |- - s| sì                      |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |  Time to Live |    Protocol   |         Header Checksum       |
 * | sì            | sì            | vuoto                         |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                Source Address       sì                        |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                Destination Address  sì                        |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                    Options          no        | Padding    no |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *
 * - IHL è sempre impostato a 5, non prevedendo l'aggiunta di campi Options
 * - L'unica delle "Flags" implementata è "More fragments" (bit 2)
 *
 * (per ovvie ragioni di performance non è stato implmentato alcun checksum nel
 * simulatore)
 */

import { EmulatorContext, InternalState } from "../emulators/DeviceEmulator";
import { MacAddress } from "./802_3";

// NOTE: Implementazione parziale, ad esempio IHL è sempre uguale a 5
export type IPv4Address = number;
export const IPV4_BROADCAST: IPv4Address = 0xffffffff;
export const IPV4_MAX_PAYLOAD = 65535 - 20;

export function ipv4ToString(ip: IPv4Address): string {
  return [
    (ip >> 24) & 0xff,
    (ip >> 16) & 0xff,
    (ip >> 8) & 0xff,
    ip & 0xff,
  ].join(".");
}

export function parseIpv4(s: string): IPv4Address | undefined {
  const octects = s.split(".");
  if (octects.length != 4) return;
  const numbers = octects.map((it) => +it);
  if (!numbers.every((it) => 0 <= it && it < 256)) return;
  return numbers.reduce((acc, val) => acc * 256 + val);
}

export type L3Interface = { ip: IPv4Address; mask: IPv4Address };

// -1 on no interface
export function getMatchingInterface(
  interfaces: L3Interface[],
  ip: IPv4Address,
): number {
  return interfaces.findIndex((v) => v && (v.ip & v.mask) == (ip & v.mask));
}

type L3InternalStateProps = {
  ipPackets: Map<number, PartialIPv4Packet>;
  l3Ifs: L3Interface[];
  gateway: IPv4Address;
  macTable: Map<IPv4Address, MacAddress>;
  packetsWaitingForARP: IPv4Packet[];
};
export type L3InternalStateBase = InternalState<L3InternalStateProps>;
export type L3InternalState<T extends object> = InternalState<
  T & {
    rawSocketFd?: (
      ctx: EmulatorContext<L3InternalState<T>>,
      packet: IPv4Packet,
    ) => void;
  } & L3InternalStateProps
>;

export function defaultL3InternalState(): L3InternalStateBase {
  return {
    ipPackets: new Map(),
    packetsWaitingForARP: [],
    l3Ifs: [],
    gateway: IPV4_BROADCAST,
    netInterfaces: [],
    macTable: new Map(),
  };
}

export function serializeL3InternalState(s: L3InternalState<object>) {
  return {
    ...s,
    macTable: Object.fromEntries(s.macTable.entries()),
    ipPackets: Object.fromEntries(s.ipPackets.entries()),
  };
}

export function deserializeL3InternalState(
  o: Record<string, unknown>,
): L3InternalStateBase {
  const s = {
    ...defaultL3InternalState(),
    ...o,
  };

  function setIf<K extends keyof L3InternalStateBase>(
    prop: K,
    transform: (v: any) => undefined | L3InternalStateBase[K],
  ) {
    if (prop in o) s[prop] = transform(o[prop]) ?? s[prop];
  }

  setIf(
    "macTable",
    (v) => new Map(Object.entries(v).map(([k, v]) => [+k, +(v as string)])),
  );
  setIf(
    "ipPackets",
    (v) =>
      new Map(Object.entries(v).map(([k, v]) => [+k, v as PartialIPv4Packet])),
  );

  return s;
}

export enum ProtocolCode {
  "icmp" = 1,
  "tcp" = 6,
  "udp" = 17,
}

export class IPv4Packet {
  ttl: number;
  protocol: ProtocolCode;
  source: IPv4Address;
  destination: IPv4Address;
  payload: Buffer;
  offset: number;
  constructor(
    protocol: IPv4Packet["protocol"],
    payload: Buffer,
    source: IPv4Address,
    destination: IPv4Address = IPV4_BROADCAST,
    ttl: number = 255,
    offset: number = 0,
  ) {
    if (payload.byteLength > IPV4_MAX_PAYLOAD)
      throw "IPv4 packet payload too large";
    if (offset % 8) throw "Offset must be multiple of 8";
    this.ttl = ttl;
    this.protocol = protocol;
    this.source = source;
    this.destination = destination;
    this.payload = payload;
    this.offset = offset;
  }
  toFragmentedBytes(maxLen: number = 576): Buffer[] {
    const header = Buffer.alloc(20);
    // https://en.wikipedia.org/wiki/IPv4#Header
    header.writeUInt8((4 << 4) | 5, 0); // Version + IHL
    header.writeUInt8(this.ttl, 8);
    header.writeUInt8(this.protocol, 9);
    header.writeUInt32BE(this.source, 12);
    header.writeUInt32BE(this.destination, 16);

    if (this.payload.byteLength + 20 < maxLen) {
      const packet = Buffer.alloc(20 + this.payload.byteLength);
      header.writeUInt16BE(packet.byteLength, 2); // Total length
      packet.set(header);
      packet.set(this.payload, 20);
      return [packet];
    }

    header.writeUInt16BE(Math.floor(Math.random() * 2 ** 16), 4); // Identification
    const packets = [];
    for (
      let offs = 0;
      offs < this.payload.byteLength;
      offs += ~0x7 & (maxLen - 20)
    ) {
      const moreFragments = this.payload.byteLength - offs > maxLen - 20;
      const packet = Buffer.alloc(
        moreFragments ? maxLen : this.payload.byteLength - offs + 20,
      );
      header.writeUInt16BE(packet.byteLength, 2); // Total length
      header.writeUInt16BE(
        (+moreFragments << 29) | // More fragments flag
          ((offs + this.offset) >> 3), // Fragment offset
        6,
      );
      packet.set(header);
      packet.set(
        this.payload.subarray(offs, offs + packet.byteLength - 20),
        20,
      );
      packets.push(packet);
    }
    return packets;
  }
}

export class PartialIPv4Packet extends IPv4Packet {
  id: number = -1;
  slices: [number, number][] = [];
  gotCompleteSize: boolean = false;
  rebuiltPayload: Buffer = Buffer.alloc(IPV4_MAX_PAYLOAD);

  constructor(first: Buffer) {
    // Not an IPv4 packet?
    if (first.readUInt8(0) >> 4 != 4) return;

    const offsetAndFlags = first.readUInt16BE(6);
    const morePackets = offsetAndFlags & (1 << 29);
    const offset = offsetAndFlags & ~(0b111 << 29);
    const payloadBuf = Buffer.alloc(IPV4_MAX_PAYLOAD);
    payloadBuf.set(first.subarray(20), offset << 3);

    super(
      first.readUInt8(9),
      payloadBuf,
      first.readUInt32BE(12),
      first.readUInt32BE(16),
      first.readUInt8(8),
    );
    this.rebuiltPayload = payloadBuf;
    this.id = first.readUInt16BE(4);
    this.slices.push([offset, offset + first.byteLength - 20]);
    if (!morePackets) {
      this.gotCompleteSize = true;
      this.rebuiltPayload = this.rebuiltPayload.subarray(0, this.slices[0][1]);
      this.payload = this.rebuiltPayload;
    }
  }

  // assumes many values to be the same
  add(packet: Buffer) {
    // Not an IPv4 packet?
    if (packet.readUInt8(0) >> 4 != 4) throw "Not an IPv4 Packet";
    if (packet.readUInt16BE(4) != this.id) throw "Non-matching ids";

    const offsetAndFlags = packet.readUInt16BE(6);
    const morePackets = offsetAndFlags & (1 << 29);
    const offset = offsetAndFlags & ~(0b111 << 29);

    const startEnd = [offset, offset + packet.byteLength - 20] satisfies [
      number,
      number,
    ];
    if (this.gotCompleteSize && startEnd[1] > this.slices.at(-1)![1])
      throw "Packet payload as finished";

    this.rebuiltPayload.set(packet.subarray(20), offset << 3);
    this.slices.push(startEnd);
    this.slices.sort((a, b) => a[0] - b[0]);
    if (!morePackets) {
      this.gotCompleteSize = true;
      this.rebuiltPayload = this.rebuiltPayload.subarray(
        0,
        this.slices.at(-1)![1],
      );
      this.payload = this.rebuiltPayload;
    }
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

  static getId(packet: Buffer): number {
    if (packet.readUInt8(0) >> 4 != 4) throw "Not an IPv4 Packet";
    return packet.readUInt16BE(4);
  }

  static getDestination(packet: Buffer): IPv4Address {
    if (packet.readUInt8(0) >> 4 != 4) throw "Not an IPv4 Packet";
    return packet.readUInt32BE(16);
  }
}

export function targetIP(
  state: L3InternalState<object>,
  destination: IPv4Address,
): { intf: number; ok: boolean; targetIp: IPv4Address } {
  let targetIp = destination;
  // L'interfaccia su cui inviare il pacchetto
  let intf = getMatchingInterface(state.l3Ifs, destination);
  // Il pacchetto non è su una rete disponibile -> invia al gateway
  if (intf == -1) {
    targetIp = state.gateway;
    intf = getMatchingInterface(state.l3Ifs, state.gateway);
    // Il gateway è invalido
    if (intf == -1) return { intf: 0, targetIp: 0, ok: false };
  }
  return { targetIp, intf, ok: true };
}
