import { trustMeBroCast } from "../common";

abstract class Field<T> {
  abstract serialize(into: Buffer, value: T): void;
  abstract deserialize(bytes: Buffer): T;
  abstract getSizeFor(value?: T): number;
  constructor(
    public name: string,
    public def?: T,
  ) { }
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

export class PacketSerializer<T extends Record<string, any>> {
  beforeToBytes(_value: T) { }
  afterToBytes(_into: Buffer, _value: T) { }

  beforeFromBytes(_bytes: Buffer) { }
  afterFromBytes(_bytes: Buffer, _value: T) { }


  constructor(public fields: Field<any>[]) { }

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
