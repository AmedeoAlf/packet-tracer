import { makeFieldConstructor } from "../packetEngine2";

export const VLANTagField = makeFieldConstructor<number | undefined>({
  serialize(into, value) {
    if (value == null) return;
    into.writeUint16BE(0x8100);
    into.writeUint16BE(value & 0xfff, 2);
  },
  deserialize(bytes) {
    const val = bytes.readUInt16BE();
    // No 802.1Q header? https://en.wikipedia.org/wiki/IEEE_802.1Q#Frame_format
    if (val != 0x8100) return;
    return bytes.readUInt16BE(2) & 0xfff;
  },
  getSizeFor: (value) => (value == null ? 0 : 4),
  stringify: (value) => JSON.stringify(value),
});

export type DHCPTLVOption = [tag: number, value: Buffer];
const STOP_TAG = 0xff;
export const DHCPTLVField = makeFieldConstructor<DHCPTLVOption[]>({
  def: [],
  serialize(into, options) {
    let cursor = 0;
    for (const [tag, value] of options) {
      into.writeUInt8(tag, cursor);
      into.writeUInt8(value.byteLength, cursor + 1);
      into.set(value, cursor + 2);
      cursor += 2 + value.byteLength;
    }
    into.writeUInt8(STOP_TAG, cursor);
  },
  deserialize(bytes) {
    const options: DHCPTLVOption[] = [];
    let cursor = 0;
    while (cursor < bytes.byteLength && bytes.readUInt8(cursor) != STOP_TAG) {
      const len = bytes.readUInt8(cursor + 1);
      options.push([
        bytes.readUInt8(cursor),
        bytes.subarray(cursor + 2, cursor + 2 + len),
      ]);
      cursor += 2 + len;
    }
    return options;
  },
  getSizeFor: (value) =>
    (value?.reduce((acc, val) => acc + 2 + val[1].byteLength, 0) ?? 0) +
    1 /* stop byte */,
  stringify: (value) => JSON.stringify(value),
});

// export class PacketField<T extends Record<string, any>> extends Field<T> {
//   constructor(
//     public name: string,
//     public serializer: PacketSerializer<T>,
//     public def?: T,
//   ) {
//     super(name, def);
//   }
//
//   serialize(into: Buffer, value: T): void {
//     this.serializer.toBytes(into, value);
//   }
//   deserialize(bytes: Buffer): T {
//     return this.serializer.fromBytes(bytes);
//   }
//   getSizeFor(value?: T): number {
//     const val = value ?? this.def;
//     return val ? this.serializer.computeSizeOf(val) : 0;
//   }
// }
//
// type OpaquePacket<T extends Record<string, any>> = [
//   value: T,
//   serializer: PacketSerializer<T>,
// ];
//
// export class OpaquePacketField extends Field<OpaquePacket<any>> {
//   constructor(
//     public name: string,
//     public getDeserializer: (bytes: Buffer) => PacketSerializer<any>,
//   ) {
//     super(name);
//   }
//
//   serialize(into: Buffer, [value, serializer]: OpaquePacket<any>): void {
//     serializer.toBytes(into, value);
//   }
//   deserialize(bytes: Buffer): any {
//     return this.getDeserializer(bytes).fromBytes(bytes);
//   }
//   getSizeFor(valueSerializer?: OpaquePacket<any>): number {
//     if (!valueSerializer) return 0;
//     const [value, serializer] = valueSerializer;
//     return serializer.computeSizeOf(value);
//   }
// }
