"use client";
import { Computer } from "./Computer";
import { Database } from "./Database";
import { DeviceFactory } from "./Device";
import { ExampleDevice } from "./ExampleDevice";
import { Router } from "./Router";
import { Server } from "./Server";
import { Switch } from "./Switch";

/*
 * Quest'oggetto contiene la lista di tutte le `DeviceFactory` esistenti,
 * assegnate al loro rispettivo `deviceType`.
 */

export const deviceTypesDB = {
  router: Router,
  switch: Switch,
  database: Database,
  server: Server,
  computer: Computer,
  exampleDevice: ExampleDevice,
} as const satisfies Record<string, DeviceFactory<any>>;

export type DeviceType = keyof typeof deviceTypesDB
