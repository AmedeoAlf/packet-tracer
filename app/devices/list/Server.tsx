import {
  defaultServerFS,
  serverEmulator,
  serverInitServices,
} from "@/app/emulators/list/serverEmulator";
import { randomMAC } from "../../protocols/802_3";
import { DeviceFactory } from "../Device";
import { OSInternalState } from "./Computer";
import { defaultL3InternalState } from "@/app/protocols/rfc_760";
import { deepCopy } from "@/app/common";

export const Server: DeviceFactory<OSInternalState> = {
  proto: {
    iconId: "#server-icon",
    emulator: serverEmulator,
    deviceType: "server",
    deserializeState(o) {
      const state = {
        ...Server.defaultState(),
        ...o,
      };
      serverInitServices(state);
      return state;
    },
  },

  defaultState() {
    return {
      ...defaultL3InternalState(),
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
      ],
      filesystem: deepCopy(defaultServerFS),
      udpSockets_t: new Map(),
      tcpSockets_t: new Map(),
    };
  },
};
