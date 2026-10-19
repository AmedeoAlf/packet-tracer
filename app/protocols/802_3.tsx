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

import { FieldBuilder, PacketSerializer2, SerializerT } from "./packetEngine2";
import { FillingBufferField } from "./packetEngineFields2/bufferFields";
import { VLANTagField } from "./packetEngineFields2/extraFields";
import MacField from "./packetEngineFields2/MacField";
import { U16Field, U32Field } from "./packetEngineFields2/numberFields";

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

export type EthernetFrame = SerializerT<typeof EthernetFrameSerializer>;

const fields = [
  MacField("dst"),
  MacField("src"),
  VLANTagField("vlanTag", true),
  U16Field("lenOrEtherType", true),
  FillingBufferField("payload", 4),
  U32Field("crc", true),
] as const;

export const EthernetFrameSerializer = new (class extends PacketSerializer2<
  typeof fields
> {
  protected beforeToBytes(value: FieldBuilder<typeof fields>) {
    // If value under MTU/unset compute it
    if (value.lenOrEtherType == null || value.lenOrEtherType <= 1500)
      value.lenOrEtherType = value.payload?.byteLength ?? 0;
  }
})(fields);
