import {
  OSInternalState,
  TCPCallback,
  UDPCallbackParams,
} from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import { IPv4Address, ProtocolCode } from "@/app/protocols/rfc_760";
import { sendIPv4Packet } from "./sendIPv4Packet";
import { TCPPacket } from "@/app/protocols/tcp";

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

export function listenAndAcceptTCP(
  state: OSInternalState,
  port: number,
  onAccept: TCPCallback,
) {
  state.tcpSockets.set(port, { state: "listen", callback: onAccept });
  return port;
}

export function dialTCP(
  ctx: EmulatorContext<OSInternalState>,
  address: IPv4Address,
  port: number,
  onConnect: TCPCallback,
): number {
  let sourcePort = 0xc000;
  while (ctx.state.tcpSockets.has(++sourcePort));

  const synPacket = TCPPacket.synPacket(sourcePort, port);
  ctx.state.tcpSockets.set(sourcePort, {
    state: "syn_sent",
    callback: onConnect,
    address,
    port,
    seq: synPacket.seq,
    ack: 0,
  });

  sendIPv4Packet(ctx as any, address, ProtocolCode.tcp, synPacket.toBytes());

  ctx.updateState();
  return sourcePort;
}

export function recv(
  state: OSInternalState,
  socket: number,
  callback: (ctx: EmulatorContext<OSInternalState>, data: Buffer) => void,
): boolean {
  const sock = state.tcpSockets.get(socket);
  if (!sock) return false;
  if (sock.state != "accepted" && sock.state != "connected") return false;
  sock.callback = (ctx, _, payload) => callback(ctx, payload);
  return true;
}

export function send(
  ctx: EmulatorContext<OSInternalState>,
  socket: number,
  payload: Buffer,
) {
  const connection = ctx.state.tcpSockets.get(socket);
  if (!connection) return;
  if (connection.state != "accepted" && connection.state != "connected") return;
  connection.seq += 1;
  sendIPv4Packet(
    ctx as any,
    connection.address,
    ProtocolCode.tcp,
    new TCPPacket(
      socket,
      connection.port,
      connection.seq,
      payload,
      connection.ack,
    ).toBytes(),
  );
}

export function close(ctx: EmulatorContext<OSInternalState>, socket: number) {
  const connection = ctx.state.tcpSockets.get(socket);
  if (!connection) return;
  if (connection.state != "listen") {
    sendIPv4Packet(
      ctx as any,
      connection.address,
      ProtocolCode.tcp,
      new TCPPacket(
        socket,
        connection.port,
        connection.seq + 1,
        Buffer.alloc(0),
        connection.ack,
        false,
        true,
      ).toBytes(),
    );
  }
  ctx.state.tcpSockets.delete(socket);
}
