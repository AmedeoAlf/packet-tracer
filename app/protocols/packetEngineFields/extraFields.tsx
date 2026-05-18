/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, PacketSerializer } from "../packetEngine";

export class VLANTagField extends Field<number | undefined> {
  serialize(into: Buffer, value: number | undefined): void {
    if (typeof value == "undefined") return;
    into.writeUInt16BE(0x8100);
    into.writeUInt16BE(value & 0xfff, 2);
  }
  deserialize(bytes: Buffer): number | undefined {
    const val = bytes.readUInt16BE();
    // No 802.1Q header? https://en.wikipedia.org/wiki/IEEE_802.1Q#Frame_format
    if (val != 0x8100) return;
    return bytes.readUInt16BE(2) & 0xfff;
  }
  getSizeFor(value: number | undefined): number {
    if (typeof value == "undefined") return 0;
    return 4;
  }
}
export type DHCPTLVOption = [tag: number, value: Buffer];
export class DHCPTLVField extends Field<DHCPTLVOption[]> {
  constructor(
    public name: string,
    public stopTag: number = 0xff,
    public def?: DHCPTLVOption[],
  ) {
    super(name, def);
  }

  serialize(into: Buffer, options: DHCPTLVOption[]): void {
    let cursor = 0;
    for (const [tag, value] of options) {
      into.writeUInt8(tag, cursor);
      into.writeUInt8(value.byteLength, cursor + 1);
      into.set(value, cursor + 2);
      cursor += 2 + value.byteLength;
    }
    into.writeUInt8(this.stopTag, cursor);
  }
  deserialize(bytes: Buffer): DHCPTLVOption[] {
    const options: DHCPTLVOption[] = [];
    let cursor = 0;
    while (
      cursor < bytes.byteLength &&
      bytes.readUInt8(cursor) != this.stopTag
    ) {
      const len = bytes.readUInt8(cursor + 1);
      options.push([
        bytes.readUInt8(cursor),
        bytes.subarray(cursor + 2, cursor + 2 + len),
      ]);
      cursor += 2 + len;
    }
    return options;
  }
  getSizeFor(value?: DHCPTLVOption[]): number {
    return (
      (value?.reduce((acc, val) => acc + 2 + val[1].byteLength, 0) ?? 0) +
      1 /* stop byte */
    );
  }
}

export class PacketField<T extends Record<string, any>> extends Field<T> {
  constructor(
    public name: string,
    public serializer: PacketSerializer<T>,
    public def?: T,
  ) {
    super(name, def);
  }

  serialize(into: Buffer, value: T): void {
    this.serializer.toBytes(into, value);
  }
  deserialize(bytes: Buffer): T {
    return this.serializer.fromBytes(bytes);
  }
  getSizeFor(value?: T): number {
    const val = value ?? this.def;
    return val ? this.serializer.computeSizeOf(val) : 0;
  }
}

type OpaquePacket<T extends Record<string, any>> = [
  value: T,
  serializer: PacketSerializer<T>,
];

export class OpaquePacketField extends Field<OpaquePacket<any>> {
  constructor(
    public name: string,
    public getDeserializer: (bytes: Buffer) => PacketSerializer<any>,
  ) {
    super(name);
  }

  serialize(into: Buffer, [value, serializer]: OpaquePacket<any>): void {
    serializer.toBytes(into, value);
  }
  deserialize(bytes: Buffer): any {
    return this.getDeserializer(bytes).fromBytes(bytes);
  }
  getSizeFor(valueSerializer?: OpaquePacket<any>): number {
    if (!valueSerializer) return 0;
    const [value, serializer] = valueSerializer;
    return serializer.computeSizeOf(value);
  }
}
