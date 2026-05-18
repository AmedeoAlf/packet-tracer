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

import { RouterInternalState } from "../devices/list/Router";
import { EmulatorContext, InternalState } from "../emulators/DeviceEmulator";
import { MacAddress } from "./802_3";
import { PacketSerializer } from "./packetEngine";
import { FillingBufferField } from "./packetEngineFields/bufferFields";
import { IPv4Field } from "./packetEngineFields/IPv4Field";
import {
  U16Field,
  U4MajorField,
  U4MinorField,
  U8Field,
} from "./packetEngineFields/numberFields";

// NOTE: Implementazione parziale, ad esempio IHL è sempre uguale a 5
export type IPv4Address = number;
export const IPV4_BROADCAST: IPv4Address = 0xffffffff;
export const IPV4_MAX_PAYLOAD = 65535 - 20;
export const IPV4_LOCALHOST = parseIpv4("127.0.0.1")!;

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
  interfaces: (L3Interface | null)[],
  ip: IPv4Address,
): number {
  return interfaces.findIndex((v) => v && (v.ip & v.mask) == (ip & v.mask));
}

export interface L3InternalState<
  TSelf extends L3InternalState<TSelf>,
> extends InternalState<TSelf> {
  rawSocketFd_t?: (ctx: EmulatorContext<TSelf>, packet: IPv4Packet) => void;
  ipPackets_t: Map<number, IPv4PacketAssembler>;
  l3Ifs: (L3Interface | null)[];
  gateway: IPv4Address;
  macTable_t: Map<IPv4Address, MacAddress>;
  packetsWaitingForARP_t: Record<IPv4Address, IPv4Packet[]>;
}

export function defaultL3InternalState<
  TSelf extends L3InternalState<TSelf>,
>(): L3InternalState<TSelf> {
  return {
    ipPackets_t: new Map(),
    packetsWaitingForARP_t: [],
    l3Ifs: [],
    gateway: IPV4_BROADCAST,
    netInterfaces: [],
    macTable_t: new Map(),
  };
}

export enum ProtocolCode {
  "icmp" = 1,
  "tcp" = 6,
  "udp" = 17,
}

export const MORE_FRAGMENTS_BIT = 1 << 13;
export const OFFSET_MASK = (1 << 13) - 1;

export type IPv4Packet = {
  version?: number;
  ihl?: number;
  typeOfService?: number;
  length?: number;
  identification?: number;
  offsetAndFlags?: number;
  ttl: number;
  protocol: ProtocolCode;
  checksum?: number;
  source: IPv4Address;
  destination: IPv4Address;
  payload: Buffer;
};

export const Ipv4Serializer = new (class extends PacketSerializer<IPv4Packet> {
  constructor() {
    super([
      new U4MajorField("version", 4),
      new U4MinorField("ihl", 5),
      new U8Field("typeOfService"),
      new U16Field("length"),
      new U16Field("identification"),
      new U16Field("offsetAndFlags"),
      new U8Field("ttl"),
      new U8Field("protocol"),
      new U16Field("checksum"),
      new IPv4Field("source"),
      new IPv4Field("destination"),
      new FillingBufferField("payload"),
    ]);
  }
  override beforeToBytes(value: IPv4Packet) {
    if (value.payload.byteLength > IPV4_MAX_PAYLOAD)
      throw "IPv4 packet payload too large";
    value.length = (value.ihl ?? 5) * 4 + value.payload.length;
  }
})();

export function ipv4ToFragmentedBytes(
  packet: IPv4Packet,
  maxLen: number = 1500,
): Buffer[] {
  const headerLen = (packet.ihl ?? 5) * 4;
  if (packet.payload.byteLength + headerLen < maxLen) {
    return [Ipv4Serializer.toBuffer(packet)];
  }

  packet.identification ??= Math.floor(Math.random() * 2 ** 16);
  packet.offsetAndFlags ??= 0;

  const payload = packet.payload;
  const originalOffset = packet.offsetAndFlags & OFFSET_MASK;

  const packets: Buffer[] = [];
  for (
    let offs = 0;
    offs < payload.byteLength;
    offs += ~0x7 & (maxLen - headerLen)
  ) {
    const moreFragments = payload.byteLength - offs > maxLen - headerLen;
    packet.payload = payload.subarray(
      offs,
      moreFragments ? offs + maxLen - headerLen : undefined,
    );
    packet.offsetAndFlags =
      (moreFragments ? MORE_FRAGMENTS_BIT : 0) | ((offs + originalOffset) >> 3);
    packets.push(Ipv4Serializer.toBuffer(packet));
  }
  return packets;
}

export class IPv4PacketAssembler {
  id: number = -1;
  subpayloads: {
    data: Buffer;
    offset: number;
  }[] = [];
  completeSize?: number;

  private original?: Required<IPv4Packet>;

  getOriginal() {
    return this.original;
  }

  constructor(public matchedData: Required<IPv4Packet>) {
    this.add(matchedData);
  }

  add(packet: Required<IPv4Packet>) {
    if (packet.identification != this.matchedData.identification) return;
    const offset = (packet.offsetAndFlags & OFFSET_MASK) << 3;
    const moreFragments = !!(packet.offsetAndFlags & MORE_FRAGMENTS_BIT);

    if (!moreFragments)
      this.completeSize = offset + packet.ihl * 4 + packet.payload.length;

    this.subpayloads.push({ data: packet.payload, offset });

    this.checkFinished();
  }

  private checkFinished() {
    if (typeof this.completeSize == "undefined") return;

    let firstMissingByte = 0;
    while (firstMissingByte < this.completeSize) {
      const payload = this.subpayloads.find(
        (it) => it.offset == firstMissingByte,
      );
      if (!payload) return false;
      firstMissingByte =
        payload.offset + this.matchedData.ihl * 4 + payload.data.length;
    }

    const payload = Buffer.alloc(this.completeSize);
    this.subpayloads.forEach((it) => payload.set(it.data, it.offset));
    this.original = {
      ...this.matchedData,
      payload,
    };
  }
}

export function targetIP<State extends L3InternalState<State>>(
  state: State,
  destination: IPv4Address,
): [ok: boolean, intf: number, targetIp: IPv4Address] {
  let targetIp = destination;
  // L'interfaccia su cui inviare il pacchetto
  let intf = getMatchingInterface(state.l3Ifs, targetIp);
  // Il pacchetto non è su una rete disponibile -> invia al gateway
  if (intf == -1) {
    function isRouterInternalState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: L3InternalState<any>,
    ): state is RouterInternalState {
      return "routingTables" in state;
    }

    if (isRouterInternalState(state)) {
      const tableEntry = state.routingTables.find(
        (it) => (it.netAddr & it.mask) == (targetIp & it.mask),
      );
      if (tableEntry) {
        targetIp = tableEntry.to;
        intf = getMatchingInterface(state.l3Ifs, targetIp);
      }
    }
    if (intf == -1) {
      targetIp = state.gateway;
      intf = getMatchingInterface(state.l3Ifs, targetIp);
      // Il gateway è invalido
      if (intf == -1) return [false, 0, 0];
    }
  }
  return [true, intf, targetIp];
}

export function getDestinationOf(payload: Buffer) {
  return payload.readUInt32BE(16);
}
