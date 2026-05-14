import {
  defaultServerFS,
  serverEmulator,
} from "@/app/emulators/list/serverEmulator";
import { randomMAC } from "../../protocols/802_3";
import { DeviceFactory } from "../Device";
import { OSInternalState } from "./Computer";
import {
  defaultL3InternalState,
  IPV4_LOCALHOST,
} from "@/app/protocols/rfc_760";
import { deepCopy } from "@/app/common";

export type ServerInternalState = OSInternalState<ServerInternalState>;

export const Server: DeviceFactory<ServerInternalState> = {
  proto: {
    iconId: "#server-icon",
    emulator: serverEmulator,
    deviceType: "server",
    deserializeState(o) {
      const state = {
        ...Server.defaultState(),
        ...o,
      };
      return state;
    },
  },

  defaultState() {
    return {
      ...defaultL3InternalState(),
      dhcpEnabled: [false, true],
      netInterfaces: [
        { name: "lo", maxMbps: 10000, type: "localhost", mac: 0 },
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
      ],
      l3Ifs: [{ ip: IPV4_LOCALHOST, mask: 0xff000000 }],
      filesystem: deepCopy(defaultServerFS),
      udpSockets_t: new Map(),
      tcpSockets_t: new Map(),
    };
  },
};
