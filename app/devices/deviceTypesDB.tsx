"use client";
import { DeviceFactory } from "./Device";
import { ExampleDevice } from "./ExampleDevice";
import { Router } from "./Router";
import { Switch } from "./Switch";


/*
 * Quest'oggetto contiene la lista di tutte le `DeviceFactory` esistenti,
 * assegnate al loro rispettivo `deviceType`.
 */
export const deviceTypesDB = {
  router: Router,
  switch: Switch,
  exampleDevice: ExampleDevice,
} as const satisfies Record<string, DeviceFactory>;

export type DeviceType = keyof typeof deviceTypesDB
