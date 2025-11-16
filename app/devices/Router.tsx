"use client";
import { routerEmulator } from "../emulators/routerEmulator";
import { randomMAC } from "../protocols/802_3";
import { DeviceFactory } from "./Device";

export const Router: DeviceFactory = {
  iconId: "#router-icon",
  emulator: routerEmulator,
  deviceType: "router",
  defaultState() {
    return {
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if1", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "se0", maxMbps: 100, type: "serial", mac: randomMAC() },
        { name: "se1", maxMbps: 100, type: "serial", mac: randomMAC() },
      ]
    }
  }
}

