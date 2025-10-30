"use client";
import { InternalState } from "../emulators/DeviceEmulator";
import { Device } from "./Device";


export class Router extends Device {
  internalState: InternalState<{}> = {
    netInterfaces: ["interface_a", "interface_b"],
  };
  readonly deviceType = "router";
}

