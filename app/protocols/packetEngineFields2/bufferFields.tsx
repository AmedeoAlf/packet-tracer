import { makeFieldConstructor } from "../packetEngine2";

export const FixedBufferField = <Name extends string>(
  name: Name,
  size: number,
) =>
  makeFieldConstructor<Buffer>({
    deserialize: (bytes) => bytes.subarray(0, size),
    serialize: (bytes, value) => bytes.set(value),
    getSizeFor: () => size,
    // TODO: find better serializer
    stringify: (val) => JSON.stringify(val),
  })(name, true);

export const FillingBufferField = <Name extends string>(
  name: Name,
  leaveTrail: number = 0,
) =>
  makeFieldConstructor<Buffer>({
    deserialize: (bytes) => bytes.subarray(0, bytes.length - leaveTrail),
    serialize: (bytes, value) => bytes.set(value),
    getSizeFor: (value) => value?.byteLength ?? 0,
    // TODO: find better serializer
    stringify: (val) => JSON.stringify(val),
  })(name, true);
