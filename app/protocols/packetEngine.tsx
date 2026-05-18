/* eslint-disable @typescript-eslint/no-explicit-any */
import { trustMeBroCast } from "../common";

export abstract class Field<T> {
  abstract serialize(into: Buffer, value: T): void;
  abstract deserialize(bytes: Buffer): T;
  abstract getSizeFor(value?: T): number;
  stringify(value: T): string {
    return JSON.stringify(value);
  }
  constructor(
    public name: string,
    public def?: T,
  ) {}
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

  fromBytes(bytes: Buffer): Required<T> {
    this.beforeFromBytes(bytes);
    const result: Record<string, any> = {};

    // TODO: handle packets too small
    for (const f of this.fields) {
      const val = f.deserialize(bytes);
      result[f.name] = val;
      bytes = bytes.subarray(f.getSizeFor(val));
    }

    trustMeBroCast<Required<T>>(result);
    this.afterFromBytes(bytes, result);
    return result;
  }
}
