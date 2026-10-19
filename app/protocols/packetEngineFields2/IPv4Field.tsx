import { makeFieldConstructor } from "../packetEngine2";
import { ipv4ToString } from "../rfc_760";

export const IPv4Field = makeFieldConstructor({
  def: 0,
  serialize: (into, value) => into.writeUInt32BE(value),
  deserialize: (bytes) => bytes.readUInt32BE(),
  getSizeFor: () => 4,
  stringify: ipv4ToString,
});

export default IPv4Field;
