"use client";
import { DeviceFactory } from "./Device";
import { Computer } from "./list/Computer";
import { Database } from "./list/Database";
import { ExampleDevice } from "./list/ExampleDevice";
import { Switch } from "./list/Switch";
import { Router } from "./list/Router";
import { Server } from "./list/Server";

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
