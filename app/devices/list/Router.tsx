"use client";
import { UDPPacket } from "@/app/protocols/udp";
import { routerEmulator } from "../../emulators/list/routerEmulator";
import { randomMAC } from "../../protocols/802_3";
import {
  defaultL3InternalState,
  deserializeL3InternalState,
  IPv4Address,
  L3InternalState,
  serializeL3InternalState,
} from "../../protocols/rfc_760";
import { Device, DeviceFactory } from "../Device";
import { trustMeBroCast } from "@/app/common";
import { removeTempFields } from "@/app/ProjectManager";

export type RoutingTableEntry = {
  netAddr: IPv4Address;
  mask: IPv4Address;
  to: IPv4Address;
};

export type RouterInternalState = L3InternalState & {
  routingTables: RoutingTableEntry[];
  udpSocket_t?: (packet: UDPPacket, from: IPv4Address) => void;

  // UI for adding new routing tables
  rtNetworkInput_t?: string;
  rtDestinationInput_t?: string;
};

export const Router: DeviceFactory<RouterInternalState> = {
  proto: {
    serializeState() {
      trustMeBroCast<Device>(this);
      return removeTempFields({
        ...serializeL3InternalState(this.internalState as L3InternalState),
      });
    },
    deserializeState(o) {
      return {
        ...Router.defaultState(),
        ...deserializeL3InternalState(o),
      };
    },
    iconId: "#router-icon",
    emulator: routerEmulator,
    deviceType: "router",
  },
  defaultState() {
    return {
      ...defaultL3InternalState(),
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if1", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "se0", maxMbps: 100, type: "serial", mac: randomMAC() },
        { name: "se1", maxMbps: 100, type: "serial", mac: randomMAC() },
      ],
      routingTables: [],
    };
  },
};
