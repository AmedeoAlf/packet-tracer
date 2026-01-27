import { OSInternalState } from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import { OSUDPPacket } from "../list/computerEmulator";

export function readUDP(state: OSInternalState, callback: (ctx: EmulatorContext<OSInternalState>, p: OSUDPPacket) => void, port?: number): number {
    if (port === undefined) {
        port = 0xC000;
        while (state.udpSockets.has(++port));
    } else if (state.udpSockets.has(port)) {
        return -1;
    }
    state.udpSockets.set(port, callback);
    return port;
}