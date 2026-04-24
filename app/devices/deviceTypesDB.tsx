"use client";
import { DeviceFactory } from "./Device";
import { Computer } from "./list/Computer";
import { ExampleDevice } from "./list/ExampleDevice";
import { Switch } from "./list/Switch";
import { Router } from "./list/Router";
import { Server } from "./list/Server";

/*
 * Quest'oggetto contiene la lista di tutti `DeviceFactory` esistenti,
 * assegnati al loro rispettivo `deviceType`.
 */
export const deviceTypesDB = {
  router: Router,
  switch: Switch,
  server: Server,
  computer: Computer,
  exampleDevice: ExampleDevice,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as const satisfies Record<string, DeviceFactory<any>>;

export type DeviceType = keyof typeof deviceTypesDB;
