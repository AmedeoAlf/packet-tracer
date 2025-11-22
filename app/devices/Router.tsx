"use client";
import { InternalState } from "../emulators/DeviceEmulator";
import { routerEmulator } from "../emulators/routerEmulator";
import { randomMAC } from "../protocols/802_3";
import { IPv4Address, PartialIPv4Packet } from "../protocols/rfc_760";
import { DeviceFactory } from "./Device";

export type RouterInternalState = InternalState<{
  ip_packets: Map<number, PartialIPv4Packet>,
  interface_ips: IPv4Address[]
}>

export const Router: DeviceFactory = {
  iconId: "#router-icon",
  emulator: routerEmulator,
  deviceType: "router",
  defaultState() {
    return {
      ip_packets: new Map(),
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if1", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "se0", maxMbps: 100, type: "serial", mac: randomMAC() },
        { name: "se1", maxMbps: 100, type: "serial", mac: randomMAC() },
      ]
    }
  }
}

