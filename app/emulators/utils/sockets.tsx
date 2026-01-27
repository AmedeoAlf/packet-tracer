import {
  OSInternalState,
  UDPCallbackParams,
} from "@/app/devices/list/Computer";

export function readUDP(
  state: OSInternalState,
  callback: (params: UDPCallbackParams) => boolean,
  port?: number,
) {
  if (port === undefined) {
    port = 0xc000;
    while (state.udpSockets.has(++port));
  } else if (state.udpSockets.has(port)) {
    return -1;
  }
  state.udpSockets.set(port, callback);
  return port;
}
