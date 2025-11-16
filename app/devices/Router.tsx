"use client";
import { routerEmulator } from "../emulators/routerEmulator";
import { DeviceFactory } from "./Device";

export const Router: DeviceFactory = {
  iconId: "#router-icon",
  emulator: routerEmulator,
  deviceType: "router",
  defaultState() {
    return {
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper" },
        { name: "if1", maxMbps: 100, type: "copper" },
        { name: "se0", maxMbps: 100, type: "serial" },
        { name: "se1", maxMbps: 100, type: "serial" },
      ]
    }
  }
}

