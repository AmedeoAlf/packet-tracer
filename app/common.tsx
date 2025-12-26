"use client";

export type Coords = { x: number; y: number };

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
