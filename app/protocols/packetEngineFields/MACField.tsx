import { MACToString } from "../802_3";
import { Field } from "../packetEngine";

export class MACField extends Field<number> {
  serialize(into: Buffer, value: number): void {
    into.writeUInt16BE(Math.floor(value / 2 ** 32));
    into.writeUInt32BE(value % 0x100000000, 2);
  }
  deserialize(bytes: Buffer): number {
    return bytes.readUInt16BE() * 2 ** 32 + bytes.readUInt32BE(2);
  }
  getSizeFor(): number {
    return 6;
  }
  stringify(value: number): string {
    return MACToString(value);
  }
}
