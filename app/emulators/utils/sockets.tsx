import {
  OSInternalState,
  TCPCallback,
  UDPCallbackParams,
} from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import { IPv4Address, ProtocolCode } from "@/app/protocols/rfc_760";
import { sendIPv4Packet } from "./sendIPv4Packet";
import { TCPPacket } from "@/app/protocols/tcp";

export function readUDP<State extends OSInternalState<State>>(
  state: State,
  callback: (params: UDPCallbackParams<State>) => boolean,
  port?: number,
) {
  if (port === undefined) {
    port = 0xc000;
    while (state.udpSockets_t.has(++port));
  }
  state.udpSockets_t.set(port, callback);
  return port;
}

export function listenAndAcceptTCP<State extends OSInternalState<State>>(
  state: State,
  port: number,
  onAccept: TCPCallback<State>,
) {
  state.tcpSockets_t.set(port, { state: "listen", callback: onAccept });
  return port;
}

export function dialTCP<State extends OSInternalState<State>>(
  ctx: EmulatorContext<State>,
  address: IPv4Address,
  port: number,
  onConnect: TCPCallback<State>,
): number {
  let sourcePort = 0xc000;
  while (ctx.state.tcpSockets_t.has(++sourcePort));

  const synPacket = TCPPacket.synPacket(sourcePort, port);
  ctx.state.tcpSockets_t.set(sourcePort, {
    state: "syn_sent",
    callback: onConnect,
    address,
    port,
    seq: synPacket.seq,
    ack: 0,
  });

  sendIPv4Packet(ctx, address, ProtocolCode.tcp, synPacket.toBytes());

  ctx.updateState();
  return sourcePort;
}

export function recv<State extends OSInternalState<State>>(
  state: State,
  socket: number,
  callback: (ctx: EmulatorContext<State>, data: Buffer) => void,
): boolean {
  const sock = state.tcpSockets_t.get(socket);
  if (!sock) return false;
  if (sock.state != "accepted" && sock.state != "connected") return false;
  sock.callback = (ctx, _, payload) => callback(ctx, payload);
  return true;
}

export function send<State extends OSInternalState<State>>(
  ctx: EmulatorContext<State>,
  socket: number,
  payload: Buffer,
) {
  const connection = ctx.state.tcpSockets_t.get(socket);
  if (!connection) return;
  if (connection.state != "accepted" && connection.state != "connected") return;
  connection.seq += 1;
  sendIPv4Packet(
    ctx,
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

export function close<State extends OSInternalState<State>>(
  ctx: EmulatorContext<State>,
  socket: number,
) {
  const connection = ctx.state.tcpSockets_t.get(socket);
  if (!connection) return;
  if (connection.state != "listen") {
    sendIPv4Packet(
      ctx,
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
  ctx.state.tcpSockets_t.delete(socket);
}
