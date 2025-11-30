"use client";
import { routerEmulator } from "../../emulators/list/routerEmulator";
import { randomMAC } from "../../protocols/802_3";
import { IPV4_BROADCAST, IPv4Address, L3InternalState } from "../../protocols/rfc_760";
import { DeviceFactory } from "../Device";

export type RoutingTableEntry = {
  netAddr: IPv4Address,
  mask: IPv4Address,
  to: IPv4Address
};
export type RouterInternalState = L3InternalState<{
  routingTables: RoutingTableEntry[]
}>;

export const Router: DeviceFactory<RouterInternalState> = {
  proto: {
    iconId: "#router-icon",
    emulator: routerEmulator,
    deviceType: "router"
  },
  defaultState() {
    return {
      ipPackets: new Map(),
      routingTables: [],
      l3Ifs: [],
      gateway: IPV4_BROADCAST,
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if1", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "se0", maxMbps: 100, type: "serial", mac: randomMAC() },
        { name: "se1", maxMbps: 100, type: "serial", mac: randomMAC() },
      ]
    }
  }
}

