import {
  defaultL3InternalState,
  IPv4Address,
  L3InternalState,
} from "@/app/protocols/rfc_760";
import { randomMAC } from "../../protocols/802_3";
import { DeviceFactory } from "../Device";
import {
  computerEmulator,
  OSUDPPacket,
} from "@/app/emulators/list/computerEmulator";
import { EmulatorContext } from "@/app/emulators/DeviceEmulator";
import { OSDir } from "@/app/emulators/utils/osFiles";

export type UDPCallbackParams = [
  ctx: EmulatorContext<OSInternalState>,
  p: OSUDPPacket,
];
export type TCPCallback = (
  ctx: EmulatorContext<OSInternalState>,
  socket: number,
  payload: Buffer,
) => void;
export type TCPConnectionState =
  | {
      state: "listen";
      callback: TCPCallback;
    }
  | {
      state: "syn_recved" | "accepted" | "syn_sent" | "connected" | "closing";
      callback: TCPCallback;
      address: IPv4Address;
      port: number;
      seq: number;
      ack: number;
    };

export type OSInternalState = L3InternalState & {
  filesystem: OSDir;
  udpSockets_t: Map<number, (params: UDPCallbackParams) => boolean>;
  tcpSockets_t: Map<number, TCPConnectionState>;
};

export const Computer: DeviceFactory<OSInternalState> = {
  proto: {
    iconId: "#pc-icon",
    emulator: computerEmulator,
    deviceType: "computer",
  },

  defaultState() {
    return {
      ...defaultL3InternalState(),
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
      ],
      filesystem: {},
      udpSockets_t: new Map(),
      tcpSockets_t: new Map(),
    };
  },
};
