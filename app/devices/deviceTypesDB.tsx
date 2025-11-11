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
  const dataProps = { "data-id": device.id };
  return (
    <>
      <use
        href={deviceTypesDB[device.deviceType].iconId}
        className={"device " + (extraClass || "")}
        {...device.pos}
        {...dataProps}
      />
      <text
        x={device.pos.x}
        y={device.pos.y + 40}
        width="100px"
        textAnchor="middle"
        fill="#ffffff"
        className="select-none"
        {...dataProps}
      >
        {device.name}
      </text>
    </>
  );
})
