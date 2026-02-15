"use client";

export type Coords = [x: number, y: number];

export function areArraysShallowEqual<T>(a: T[], b: T[]): boolean {
  if (a.length != b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
  return true;
}

export function areMapsShallowEqual<K, V>(a: Map<K, V>, b: Map<K, V>): boolean {
  if (a.size != b.size) return false;
  for (const [k, v] of a) if (b.get(k) != v) return false;
  return true;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(Math.min(n, max), min);
}

export function cloneWithProto<T extends object>(obj: T): T {
  return Object.setPrototypeOf({ ...obj }, Object.getPrototypeOf(obj));
}

export function intRange(from: number, to: number): number[] {
  return new Array(to - from).fill(1).map((_, i) => i + from);
}

export function trustMeBroCast<T>(t: any): asserts t is T {
  return;
}

export type PrimitiveType = ReturnType<(n: any) => typeof n>;

export function deepCopy<T>(t: T): T {
  switch (typeof t) {
    case "object":
      switch (true) {
        case t === null:
          return null as T;
        case t instanceof Map:
          return new Map(t.entries().map(([k, v]) => [k, deepCopy(v)])) as T;
        case t instanceof Array:
          return t.map((it) => deepCopy(it)) as T;
        default:
          return Object.setPrototypeOf(
            Object.fromEntries(
              Object.entries(t).map(([k, v]) => [k, deepCopy(v)]),
            ),
            Object.getPrototypeOf(t),
          ) as T;
      }
    default:
      return t;
  }
}

export function capitalize(s: string) {
  const arr = [...s];
  arr[0] = arr[0].toUpperCase();
  return arr.join("");
}

export function arraySwap<T>(arr: T[], a: number, b: number) {
  const t = arr[a];
  arr[a] = arr[b];
  arr[b] = t;
}

export function findInBuffer(
  buffer: ArrayLike<number>,
  sequence: ArrayLike<number>,
): number {
  for (let i = 0; i <= buffer.length - sequence.length; i++) {
    let j = 0;
    for (; buffer[i + j] == sequence[j] && j < sequence.length; j++);
    if (j == sequence.length) return i;
  }
  return -1;
}
