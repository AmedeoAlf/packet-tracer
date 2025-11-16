"use client";

export type Coords = { x: number; y: number; };

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
