import {
  defaultL3InternalState,
  deserializeL3InternalState,
  IPv4Address,
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
export type TCPCallbackParams = [
  ctx: EmulatorContext<OSInternalState>,
  socket: number,
  payload: Buffer,
];
export type TCPConnectionState =
  | {
      state: "listen";
      callback: (params: TCPCallbackParams) => void;
    }
  | {
      state: "syn_recved" | "accepted" | "syn_sent" | "connected";
      callback: (params: TCPCallbackParams) => void;
      address: IPv4Address;
      port: number;
      seq: number;
      ack: number;
    };

export type OSInternalState = L3InternalState & {
  filesystem: OSDir;
  udpSockets: Map<number, (params: UDPCallbackParams) => boolean>;
  tcpSockets: Map<number, TCPConnectionState>;
};

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
        ...serializeL3InternalState(state as L3InternalState),
        udpSockets: undefined,
        tcpSockets: undefined,
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

  defaultState() {
    return {
      ...defaultL3InternalState(),
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
      ],
      filesystem: {},
      udpSockets: new Map(),
      tcpSockets: new Map(),
    };
  },
};
