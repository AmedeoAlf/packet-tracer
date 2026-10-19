import { makeFieldConstructor } from "../packetEngine2";

export const FixedBufferField = <Name extends string, Optional extends boolean>(
  name: Name,
  size: number,
  optional?: Optional,
) =>
  makeFieldConstructor<Buffer>({
    deserialize: (bytes) => bytes.subarray(0, size),
    serialize: (bytes, value) => bytes.set(value),
    getSizeFor: () => size,
    // TODO: find better serializer
    stringify: (val) => JSON.stringify(val),
  })(name, optional);

export const FillingBufferField = <
  Name extends string,
  Optional extends boolean,
>(
  name: Name,
  leaveTrail: number = 0,
  optional?: Optional,
) =>
  makeFieldConstructor<Buffer>({
    deserialize: (bytes) => bytes.subarray(0, bytes.length - leaveTrail),
    serialize: (bytes, value) => bytes.set(value),
    getSizeFor: (value) => value?.byteLength ?? 0,
    // TODO: find better serializer
    stringify: (val) => JSON.stringify(val),
  })(name, optional);
