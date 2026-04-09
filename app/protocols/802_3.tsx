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

import {
  FillingBufferField,
  MACField,
  PacketSerializer,
  U16Field,
  U32Field,
  VLANTagField,
} from "./packetEngine";

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

export type Layer2P = {
  dst: MacAddress;
  src: MacAddress;
  vlanTag?: number;
  lenOrEthertype?: number;
  payload: Buffer;
  crc?: number;
};

class EthernetFrameSerializerConstructor extends PacketSerializer<Layer2P> {
  constructor() {
    super([
      new MACField("dst"),
      new MACField("src"),
      new VLANTagField("vlanTag", 0),
      new U16Field("lenOrEtherType", 0),
      new FillingBufferField("payload", 4),
      new U32Field("crc", 0),
    ]);
  }

  protected beforeToBytes(value: Layer2P): void {
    // If value under MTU/unset compute it
    if (
      typeof value.lenOrEthertype == "undefined" ||
      value.lenOrEthertype <= 1500
    )
      value.lenOrEthertype = value.payload.byteLength;
  }
}

export const EthernetFrameSerializer = new EthernetFrameSerializerConstructor();
