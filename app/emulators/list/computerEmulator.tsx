import { IPv4Address, IPv4Packet, ProtocolCode } from "../../protocols/rfc_760";
import { hello } from "../../virtualPrograms/hello";
import { interfacesL3 } from "../../virtualPrograms/interfacesl3";
import { l2send } from "../../virtualPrograms/l2send";
import { ping } from "../../virtualPrograms/ping";
import { DeviceEmulator, EmulatorContext } from "../DeviceEmulator";
import { arptable } from "@/app/virtualPrograms/arptable";
import { udpSend } from "@/app/virtualPrograms/udpSend";
import { UDPPacket } from "@/app/protocols/udp";
import { OSInternalState } from "@/app/devices/list/Computer";
import { nslookup } from "@/app/virtualPrograms/nslookup";
import { cat } from "@/app/virtualPrograms/cat";
import { writeFile } from "@/app/virtualPrograms/writeFile";
import { ls } from "@/app/virtualPrograms/ls";
import { recvIPv4Packet } from "../utils/recvIPv4Packet";
import { TCPPacket } from "@/app/protocols/tcp";
import { sendIPv4Packet } from "../utils/sendIPv4Packet";

export type OSUDPPacket = {
  from: IPv4Address;
  fromPort: number;
  toPort: number;
  payload: Buffer;
};

export const computerEmulator: DeviceEmulator<OSInternalState> = {
  configPanel: {
    wip() {
      return <>UI Work in progress</>;
    },
  },
  packetHandler(ctx, data, intf) {
    const packet = recvIPv4Packet(ctx, data, intf);
    if (packet) computerPacketHandler(ctx, packet);
  },
  cmdInterpreter: {
    shell: {
      subcommands: {
        hello: hello,
        interfaces: interfacesL3,
        l2send: l2send,
        ping: ping as any,
        arptable: arptable,
        "udp-send": udpSend,
        nslookup: nslookup,
        cat: cat,
        writeFile: writeFile,
        ls: ls,
      },
    },
  },
};

export function computerPacketHandler(
  ctx: EmulatorContext<OSInternalState>,
  packet: IPv4Packet,
) {
  switch (packet.protocol) {
    case ProtocolCode.udp:
      const udpPacket = UDPPacket.fromBytes(packet.payload);
      const completed = ctx.state.udpSockets
        .get(udpPacket.destination)
        ?.call(null, [
          ctx,
          {
            from: packet.source,
            fromPort: udpPacket.source,
            toPort: udpPacket.destination,
            payload: udpPacket.payload,
          },
        ]);
      if (completed) ctx.state.udpSockets.delete(udpPacket.destination);
      break;
    case ProtocolCode.tcp:
      const tcpPacket = TCPPacket.fromBytes(packet.payload);
      const connectionState = ctx.state.tcpSockets.get(tcpPacket.destination);
      if (!connectionState) return;

      const destroySocket = () => {
        ctx.state.tcpSockets.delete(tcpPacket.destination);
      };
      const osCallback = () =>
        connectionState.callback([
          ctx,
          tcpPacket.destination,
          tcpPacket.payload,
        ]);
      const answerWith = (tcpPacket: TCPPacket) =>
        sendIPv4Packet(
          ctx as any,
          packet.source,
          ProtocolCode.tcp,
          tcpPacket.toBytes(),
        );

      switch (connectionState.state) {
        case "listen": {
          if (!tcpPacket.syn || tcpPacket.ack !== undefined)
            return destroySocket();
          const answer = TCPPacket.synAckPacket(tcpPacket);
          ctx.state.tcpSockets.set(tcpPacket.destination, {
            state: "syn_recved",
            address: packet.source,
            callback: connectionState.callback,
            port: tcpPacket.source,
            seq: answer.seq,
            ack: answer.ack!,
          });
          answerWith(answer);
          break;
        }
        case "syn_sent": {
          if (!tcpPacket.syn || tcpPacket.ack === undefined)
            return destroySocket();

          const answer = TCPPacket.ackPacket(tcpPacket);
          connectionState.ack = answer.ack!;
          answerWith(answer);
          connectionState.state = "connected";
          osCallback();
          break;
        }
        case "syn_recved": {
          if (tcpPacket.syn || tcpPacket.ack === undefined)
            return destroySocket();
          connectionState.state = "accepted";
          osCallback();
          break;
        }
        case "accepted":
        case "connected":
          // Packets are obviously not missing and in order
          connectionState.ack = tcpPacket.seq;
          osCallback();
          break;
      }
  }
  ctx.updateState();
}
