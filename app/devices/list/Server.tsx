import {
  defaultServerFS,
  serverEmulator,
  serverInitServices,
} from "@/app/emulators/list/serverEmulator";
import { randomMAC } from "../../protocols/802_3";
import { Device, DeviceFactory } from "../Device";
import { OSInternalState } from "./Computer";
import {
  defaultL3InternalState,
  deserializeL3InternalState,
  L3InternalState,
  serializeL3InternalState,
} from "@/app/protocols/rfc_760";
import { deepCopy, trustMeBroCast } from "@/app/common";
import { removeTempFields } from "@/app/ProjectManager";

export const Server: DeviceFactory<OSInternalState> = {
  proto: {
    iconId: "#server-icon",
    emulator: serverEmulator,
    deviceType: "server",
    serializeState() {
      trustMeBroCast<Device>(this);
      return removeTempFields({
        ...serializeL3InternalState(this.internalState as L3InternalState),
        udpSockets: undefined,
        tcpSockets: undefined,
      });
    },
    deserializeState(o) {
      const state = {
        ...Server.defaultState(),
        ...deserializeL3InternalState(o),
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
      udpSockets: new Map(),
      tcpSockets: new Map(),
    };
  },
};
