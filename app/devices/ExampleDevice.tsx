"use client";
import { InternalState } from "../emulators/DeviceEmulator";
import { exampleDeviceEmulator } from "../emulators/exampleDeviceEmulator";
import { DeviceFactory } from "./Device";

export type ExampleDeviceInternalState = InternalState<{ exampleProp1: number, exampleProp2: string }>

export const ExampleDevice: DeviceFactory = {
  // The SVG `<g>` tag for the device icon, list is in `ICONS.tsx`
  iconId: "#router-icon",
  // The `DeviceEmulator` (which is what handles the `InternalState`)
  emulator: exampleDeviceEmulator,
  // The device type code (must be present in `deviceTypeDB.tsx`)
  deviceType: "exampleDevice",
  // Function called to generate the InternalState of the device
  // it is meant to set all extra params related to device
  defaultState(): ExampleDeviceInternalState {
    return {
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper" },
        { name: "if1", maxMbps: 100, type: "copper" },
      ],
      exampleProp1: 42,
      exampleProp2: "Some string to be assigned to this prop"
    }
  }
}

