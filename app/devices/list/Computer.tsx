import {
  defaultL3InternalState,
  deserializeL3InternalState,
  L3InternalState,
  serializeL3InternalState,
} from "@/app/protocols/rfc_760";
import { randomMAC } from "../../protocols/802_3";
import { Device, DeviceFactory } from "../Device";
import {
  computerEmulator,
  OSUDPPacket,
} from "@/app/emulators/list/computerEmulator";
import { EmulatorContext } from "@/app/emulators/DeviceEmulator";
import { OSDir } from "@/app/emulators/utils/osFiles";
import { trustMeBroCast } from "@/app/common";

export type UDPCallbackParams = [
  ctx: EmulatorContext<OSInternalState>,
  p: OSUDPPacket,
];
export type OSInternalState = L3InternalState<{
  filesystem: OSDir;
  udpSockets: Map<number, (params: UDPCallbackParams) => void>;
}>;

export const Computer: DeviceFactory<OSInternalState> = {
  proto: {
    iconId: "#pc-icon",
    emulator: computerEmulator,
    deviceType: "computer",
    serializeState() {
      trustMeBroCast<Device>(this);
      const state = this.internalState as OSInternalState;
      return {
        ...state,
        ...serializeL3InternalState(state as L3InternalState<object>),
        udpSockets: undefined,
      };
    },
    // FIXME: check if this is right
    deserializeState(o) {
      return {
        ...Computer.defaultState(),
        ...deserializeL3InternalState(o),
      };
    },
  },

  // Default State Switch da Cambiare
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
