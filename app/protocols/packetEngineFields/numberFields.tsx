import { Field } from "../packetEngine";

function numberStringify(size: number, value: number) {
  return `0x${value.toString(16).padStart(size * 2, "0")} (${value})`;
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
  stringify(value: number): string {
    return numberStringify(4, value);
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
  stringify(value: number): string {
    return numberStringify(2, value);
  }
}

export class U4MajorField extends Field<number> {
  serialize(into: Buffer, value: number): void {
    into.writeUInt8((value << 4) | (into.readUInt8() & 0xf));
  }
  deserialize(bytes: Buffer): number {
    return bytes.readUInt8() >> 4;
  }
  getSizeFor(): number {
    return 0;
  }
  stringify(value: number): string {
    return numberStringify(0.5, value);
  }
}

export class U4MinorField extends U4MajorField {
  serialize(into: Buffer, value: number): void {
    into.writeUInt8((value & 0xf) | (into.readUInt8() & 0xf0));
  }
  deserialize(bytes: Buffer): number {
    return bytes.readUInt8() & 0xf;
  }
  getSizeFor(): number {
    return 1;
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
  stringify(value: number): string {
    return numberStringify(1, value);
  }
}
