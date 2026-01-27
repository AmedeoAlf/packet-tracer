import { serverEmulator } from "@/app/emulators/list/serverEmulator";
import { randomMAC } from "../../protocols/802_3";
import { DeviceFactory } from "../Device";
import { OSInternalState } from "./Computer";
import { defaultL3InternalState } from "@/app/protocols/rfc_760";

export const Server: DeviceFactory<OSInternalState> = {
  proto: {
    iconId: "#server-icon",
    emulator: serverEmulator,
    deviceType: "server",
  },

  defaultState() {
    return {
      ...defaultL3InternalState(),
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
      ],
      filesystem: {},
      udpSockets: new Map(),
    };
  },
};
