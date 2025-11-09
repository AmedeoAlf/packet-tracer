"use client";
import { memo } from "react";
import { Device } from "./Device";
import { ExampleDevice } from "./ExampleDevice";
import { Router } from "./Router";
import { Switch } from "./Switch";


export const deviceTypesDB = {
  router: Router,
  switch: Switch,
  exampleDevice: ExampleDevice,
};

export type DeviceType = keyof typeof deviceTypesDB

export const DeviceComponent = memo((
  { device, extraClass }: { device: Device, extraClass?: string },
) => {
  return (
    <use
      href={deviceTypesDB[device.deviceType].iconId}
      className={"device " + (extraClass || "")}
      {...device.pos}
      {...{ "data-id": device.id }}
    />
  );
})
