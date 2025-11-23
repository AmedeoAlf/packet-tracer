"use client";
import { InternalState } from "../emulators/DeviceEmulator";
import { routerEmulator } from "../emulators/routerEmulator";
import { randomMAC } from "../protocols/802_3";
import { IPv4Address, L3Interface, PartialIPv4Packet } from "../protocols/rfc_760";
import { DeviceFactory } from "./Device";

export type RoutingTableEntry = {
  netAddr: IPv4Address,
  mask: IPv4Address,
  to: IPv4Address
};
export type RouterInternalState = InternalState<{
  ipPackets: Map<number, PartialIPv4Packet>,
  l3Ifs: L3Interface[],
  routingTables: RoutingTableEntry[]
}>;

export const Router: DeviceFactory<RouterInternalState> = {
  iconId: "#router-icon",
  emulator: routerEmulator,
  deviceType: "router",
  defaultState() {
    return {
      ipPackets: new Map(),
      routingTables: [],
      l3Ifs: [],
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if1", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "se0", maxMbps: 100, type: "serial", mac: randomMAC() },
        { name: "se1", maxMbps: 100, type: "serial", mac: randomMAC() },
      ]
    }
  }
}

