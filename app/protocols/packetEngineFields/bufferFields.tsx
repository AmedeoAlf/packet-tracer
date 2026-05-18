import { Field } from "../packetEngine";

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
  getSizeFor(): number {
    return this.length;
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
