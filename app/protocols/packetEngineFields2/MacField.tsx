import { MACToString } from "../802_3";
import { makeFieldConstructor } from "../packetEngine2";

export const MacField = makeFieldConstructor<number>({
  serialize(into, value) {
    into.writeUInt16BE(Math.floor(value / 2 ** 32));
    into.writeUInt32BE(value % 0x100000000, 2);
  },
  deserialize: (bytes) =>
    bytes.readUInt16BE() * 2 ** 32 + bytes.readUInt32BE(2),
  getSizeFor: () => 6,
  stringify: MACToString,
});

export default MacField;
