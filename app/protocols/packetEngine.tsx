import { trustMeBroCast } from "../common";

abstract class Field<T> {
  abstract serialize(into: Buffer, value: T): void;
  abstract deserialize(bytes: Buffer): T;
  abstract getSizeFor(value?: T): number;
  constructor(
    public name: string,
    public def?: T,
  ) {}
}

export class U32Field extends Field<number> {
  serialize(into: Buffer, value: number): void {
    into.writeUInt32BE(value);
  }
  deserialize(bytes: Buffer): number {
    return bytes.readUInt32BE();
  }
  getSizeFor(): number {
    return 4;
  }
}

export class U16Field extends Field<number> {
  serialize(into: Buffer, value: number): void {
    into.writeUInt16BE(value);
  }
  deserialize(bytes: Buffer): number {
    return bytes.readUInt16BE();
  }
  getSizeFor(): number {
    return 2;
  }
}

export class U8Field extends Field<number> {
  serialize(into: Buffer, value: number): void {
    into.writeUInt8(value);
  }
  deserialize(bytes: Buffer): number {
    return bytes.readUInt8();
  }
  getSizeFor(): number {
    return 1;
  }
}

export class FixedBufferField extends Field<Buffer> {
  constructor(
    public name: string,
    public length: number,
    public def?: Buffer,
  ) {
    super(name, def);
  }

  serialize(into: Buffer, value: Buffer): void {
    into.set(value);
  }
  deserialize(bytes: Buffer): Buffer {
    return bytes.subarray(0, this.length);
  }
  getSizeFor(value?: Buffer): number {
    return value ? value.byteLength : 0;
  }
}

export class FillingBufferField extends Field<Buffer> {
  constructor(
    public name: string,
    public leaveTrail: number = 0,
    public def?: Buffer,
  ) {
    super(name, def);
  }

  serialize(into: Buffer, value: Buffer): void {
    into.set(value);
  }
  deserialize(bytes: Buffer): Buffer {
    return bytes.subarray(0, bytes.length - this.leaveTrail);
  }
  getSizeFor(value?: Buffer): number {
    return value ? value.byteLength : 0;
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

export class PacketSerializer<T extends Record<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected beforeToBytes(_value: T) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterToBytes(_into: Buffer, _value: T) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected beforeFromBytes(_bytes: Buffer) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterFromBytes(_bytes: Buffer, _value: T) {}

  constructor(public fields: Field<any>[]) {}

  computeSizeOf(value: T): number {
    return this.fields
      .map((f) => f.getSizeFor(value[f.name] ?? f.def))
      .reduce((acc, val) => acc + val);
  }

  toBytes(into: Buffer, value: T) {
    this.beforeToBytes(value);
    let subarr = into;
    for (const f of this.fields) {
      const val = value[f.name] ?? f.def;
      if (typeof val !== "undefined") f.serialize(subarr, val);
      subarr = subarr.subarray(f.getSizeFor(val));
    }
    this.afterToBytes(into, value);
  }

  toBuffer(value: T) {
    const buf = Buffer.alloc(this.computeSizeOf(value));
    this.toBytes(buf, value);
    return buf;
  }

  fromBytes(bytes: Buffer): T {
    this.beforeFromBytes(bytes);
    const result: Record<string, any> = {};

    // TODO: handle packets too small
    for (const f of this.fields) {
      const val = f.deserialize(bytes);
      result[f.name] = val;
      bytes = bytes.subarray(f.getSizeFor(val));
    }

    trustMeBroCast<T>(result);
    this.afterFromBytes(bytes, result);
    return result;
  }
}
