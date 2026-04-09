abstract class Field<T> {
  abstract serialize(into: Buffer, value: T): void;
  abstract deserialize(bytes: Buffer): T;
  abstract getSizeFor(value?: T): number;
  constructor(
    public name: string,
    public def?: T,
  ) {}
}

class U32Field extends Field<number> {
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

class U16Field extends Field<number> {
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

class U8Field extends Field<number> {
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

class FixedBufferField extends Field<Buffer> {
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

class FillingBufferField extends Field<Buffer> {
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

class PacketField<T extends Record<string, any>> extends Field<T> {
  constructor(
    public name: string,
    public serializer: PacketSerializer<T>,
    public def?: T,
  ) {
    super(name, def);
  }

  serialize(into: Buffer, value: T): void {
    into.set(this.serializer.toBytes(value));
  }
  deserialize(bytes: Buffer): T {
    return this.serializer.fromBytes(bytes);
  }
  getSizeFor(value?: T): number {
    const val = value ?? this.def;
    return val ? this.serializer.computeSizeOf(val) : 0;
  }
}

class PacketSerializer<T extends Record<string, any>> {
  constructor(public fields: Field<any>[]) {}

  computeSizeOf(value: T): number {
    return this.fields
      .map((f) => f.getSizeFor(value[f.name] ?? f.def))
      .reduce((acc, val) => acc + val);
  }

  toBytes(value: T): Buffer {
    const pkt = Buffer.alloc(this.computeSizeOf(value));

    let subarr = pkt;
    for (const f of this.fields) {
      const val = value[f.name] ?? f.def;
      if (typeof val !== "undefined") f.serialize(subarr, val);
      subarr = subarr.subarray(f.getSizeFor(val));
    }

    return pkt;
  }

  fromBytes(bytes: Buffer): T {
    const result: Record<string, any> = {};

    for (const f of this.fields) {
      const val = f.deserialize(bytes);
      result[f.name] = val;
      bytes = bytes.subarray(f.getSizeFor(val));
    }

    return result as T;
  }
}
