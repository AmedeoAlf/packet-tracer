import { trustMeBroCast } from "../common";

export type FieldVtable<T> = {
  def?: T;
  serialize(into: Buffer, value: T): void;
  deserialize(bytes: Buffer): T;
  getSizeFor(value?: T): number;
  stringify(value: T): string;
};

export type RequiredField2<T, Name extends string> = [
  name: Name,
  vtable: FieldVtable<T>,
];

export type OptionalField2<T, Name extends string> = [
  name: Name,
  vtable: FieldVtable<T>,
  optional: true,
];

export type Field2<T, Name extends string> =
  OptionalField2<T, Name> | RequiredField2<T, Name>;

export type FieldConstructor<T> = <
  Name extends string,
  Optional extends boolean | undefined,
>(
  fieldName: Name,
  optional?: Optional,
  def?: T,
) => Optional extends true ? OptionalField2<T, Name> : Field2<T, Name>;

export const makeFieldConstructor = <T,>(
  vtable: FieldVtable<T>,
): FieldConstructor<T> =>
  ((name, optional, def) => [
    name,
    def != null && def === vtable.def ? vtable : { ...vtable, def },
    optional,
  ]) as FieldConstructor<T>;

type _FieldValue<F> =
  F extends Field2<unknown, string>
    ? F[1] extends FieldVtable<infer T>
      ? T
      : never
    : never;

export type FieldBuilder<fields extends readonly Field2<unknown, string>[]> = {
  [
    K in fields[number] as K extends RequiredField2<unknown, string>
      ? K[0]
      : never
  ]: _FieldValue<K>;
} & {
  [
    K in fields[number] as K extends OptionalField2<unknown, string>
      ? K[0]
      : never
  ]?: _FieldValue<K>;
};

const vtable = <T,>(field: Field2<T, string>) => field[1];
const name = <Name extends string>(field: Field2<unknown, Name>) => field[0];

const get = <For extends FieldBuilder<[]>, T>(
  self: For,
  field: Field2<T, string>,
  // we can't convey how this is safe for what I know
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): T | null => (self as any)[name(field)] ?? vtable(field).def;

const set = <For extends FieldBuilder<[]>, T>(
  self: For,
  field: Field2<T, string>,
  value: T | null,
) => {
  // we can't convey how this is safe for what I know
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any)[name(field)] = value;
};

export class PacketSerializer2<
  Fields extends readonly Field2<unknown, string>[],
  T extends FieldBuilder<Fields> = FieldBuilder<Fields>,
> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected beforeToBytes(_value: T) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterToBytes(_into: Buffer, _value: T) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected beforeFromBytes(_bytes: Buffer) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterFromBytes(_bytes: Buffer, _value: T) {}

  constructor(public fields: Fields) {}

  computeSizeOf(value: T): number {
    return this.fields
      .map((f) => vtable(f).getSizeFor(get(value, f) ?? vtable(f).def))
      .reduce((acc, val) => acc + val);
  }

  toBytes(into: Buffer, value: T) {
    this.beforeToBytes(value);
    let subarr = into;
    for (const f of this.fields) {
      const val = get(value, f);
      if (typeof val !== "undefined") vtable(f).serialize(subarr, val);
      subarr = subarr.subarray(vtable(f).getSizeFor(val));
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
    const result = {} as T;

    // TODO: handle packets too small
    for (const f of this.fields) {
      const val = vtable(f).deserialize(bytes);
      set(result, f, val);
      bytes = bytes.subarray(vtable(f).getSizeFor(val));
    }

    trustMeBroCast<Required<T>>(result);
    this.afterFromBytes(bytes, result);
    return result;
  }

  peek<K extends keyof T>(bytes: Buffer, fieldName: K): T[K] | null {
    for (const f of this.fields) {
      const val = vtable(f).deserialize(bytes) as T[K] | null;
      if (name(f) == fieldName) return val;
      bytes = bytes.subarray(vtable(f).getSizeFor(val));
    }
    return null;
  }
}

export type SerializerT<Serializer> =
  Serializer extends PacketSerializer2<
    readonly Field2<unknown, string>[],
    infer T
  >
    ? T
    : never;
