"use client";
import { InternalState } from "../emulators/DeviceEmulator";
import { exampleDeviceEmulator } from "../emulators/exampleDeviceEmulator";
import { DeviceFactory } from "./Device";

export type ExampleDeviceInternalState = InternalState<{ exampleProp1: number, exampleProp2: string }>

export const ExampleDevice: DeviceFactory = {
  // L'id del tag `<g>` per l'icona del dispositivo, la lista è in `ICONS.tsx`
  iconId: "#router-icon",
  // Il `DeviceEmulator` (l'oggetto che gestisce `InternalState`)
  emulator: exampleDeviceEmulator,
  // Il tipo di dispositivo (deve essere presente in `deviceTypeDB.tsx`)
  deviceType: "exampleDevice",
  // Funzione chiamata per impostare l'`internalState` di default
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

