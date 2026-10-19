import { makeFieldConstructor } from "../packetEngine2";

function numberStringify(size: number, value: number) {
  return `0x${value.toString(16).padStart(size * 2, "0")} (${value})`;
}

type WriteMethods = keyof {
  [
    K in keyof Buffer as Buffer[K] extends (
      n: number,
      offset?: number,
    ) => number
      ? K
      : never
  ]: undefined;
};

type ReadMethods = keyof {
  [
    K in keyof Buffer as Buffer[K] extends (offset?: number) => number
      ? K
      : never
  ]: undefined;
};

const fieldConstructorFor = (
  bytesize: number,
  write: WriteMethods,
  read: ReadMethods,
) =>
  makeFieldConstructor({
    def: 0,
    deserialize: (bytes) => bytes[read](),
    getSizeFor: () => bytesize,
    stringify: (v) => numberStringify(bytesize, v),
    serialize: (into, value) => into[write](value),
  });

export const U32Field = fieldConstructorFor(4, "writeUInt32BE", "readUInt32BE");
export const U16Field = fieldConstructorFor(2, "writeUInt16BE", "readUInt16BE");
export const U8Field = fieldConstructorFor(1, "writeUInt8", "readUInt8");

export const U4MajorField = makeFieldConstructor({
  def: 0,
  serialize: (into, value) =>
    into.writeUInt8((value << 4) | (into.readUInt8() & 0xf)),
  deserialize: (bytes) => bytes.readUInt8() >> 4,
  getSizeFor: () => 0,
  stringify: (value) => numberStringify(0.5, value),
});

export const U4MinorField = makeFieldConstructor({
  def: 0,
  serialize: (into, value) =>
    into.writeUInt8((value & 0xf) | (into.readUInt8() & 0xf0)),
  deserialize: (bytes) => bytes.readUInt8() & 0xf,
  getSizeFor: () => 1,
  stringify: (value) => numberStringify(0.5, value),
});
