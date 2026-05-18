import {
  IPv4Address,
  IPv4Packet,
  ipv4ToString,
  ProtocolCode,
} from "../../protocols/rfc_760";
import hello from "../../virtualPrograms/hello";
import l2send from "../../virtualPrograms/l2send";
import ping from "../../virtualPrograms/ping";
import { DeviceEmulator, EmulatorContext } from "../DeviceEmulator";
import arptable from "@/app/virtualPrograms/arptable";
import udpSend from "@/app/virtualPrograms/udpSend";
import { UDPSerializer } from "@/app/protocols/udp";
import {
  ComputerInternalState,
  OSInternalState,
} from "@/app/devices/list/Computer";
import nslookup from "@/app/virtualPrograms/nslookup";
import cat from "@/app/virtualPrograms/cat";
import writeFile from "@/app/virtualPrograms/writeFile";
import ls from "@/app/virtualPrograms/ls";
import { recvIPv4Packet } from "../utils/recvIPv4Packet";
import {
  ackPacket,
  synAckPacket,
  TCPFlag,
  TCPPacket,
  TcpSerializer,
} from "@/app/protocols/tcp";
import { sendIPv4Packet } from "../utils/sendIPv4Packet";
import tcphello from "@/app/virtualPrograms/tcpsend";
import tcplisten from "@/app/virtualPrograms/tcplisten";
import curl from "@/app/virtualPrograms/curl";
import gatewayCmd from "@/app/virtualPrograms/gateway";
import impostazioniDiRete from "../panels/impostazioniDiRete";
import { EthernetFrameSerializer, EtherType } from "@/app/protocols/802_3";
import { dhcpDaemonInit, handleDHCPPacket } from "../utils/dhcpClient";
import { writeFileInLocation } from "../utils/osFiles";
import interfacesDhcp from "@/app/virtualPrograms/interfacesDhcp";
import fileManager from "../panels/fileManager";

export type OSUDPPacket = {
  from: IPv4Address;
  fromPort: number;
  toPort: number;
  payload: Buffer;
};

export const computerEmulator: DeviceEmulator<ComputerInternalState> = {
  configPanel: {
    "Impostazioni di rete": (ctx) => impostazioniDiRete(ctx, 1),
    Filemanager: fileManager,
  },
  init: dhcpDaemonInit,
  packetHandler(ctx, data, intf) {
    const l2Pkt = EthernetFrameSerializer.fromBytes(data);
    if (l2Pkt.lenOrEtherType == EtherType.dhcp)
      return handleDHCPPacket(ctx, intf, l2Pkt, (dns) => {
        writeFileInLocation(
          ctx.state.filesystem,
          "/etc/dns",
          ipv4ToString(dns),
        );
      });
    const packet = recvIPv4Packet(ctx, l2Pkt, intf);
    if (packet) computerPacketHandler(ctx, packet);
  },
  cmdInterpreter: {
    shell: {
      subcommands: {
        hello: hello(),
        interfaces: interfacesDhcp(),
        l2send: l2send(),
        ping: ping(),
        arptable: arptable(),
        "udp-send": udpSend(),
        nslookup: nslookup(),
        cat: cat(),
        writeFile: writeFile(),
        ls: ls(),
        tcphello: tcphello(),
        tcplisten: tcplisten(),
        curl: curl(),
        gateway: gatewayCmd(),
      },
    },
  },
};

export function computerPacketHandler<State extends OSInternalState<State>>(
  ctx: EmulatorContext<State>,
  packet: IPv4Packet,
) {
  switch (packet.protocol) {
    case ProtocolCode.udp:
      const udpPacket = UDPSerializer.fromBytes(packet.payload);
      const completed = ctx.state.udpSockets_t
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
      if (completed) ctx.state.udpSockets_t.delete(udpPacket.destination);
      break;
    case ProtocolCode.tcp:
      tcpPacketHandler(ctx, packet);
      break;
  }
  ctx.updateState();
}

export function tcpPacketHandler<State extends OSInternalState<State>>(
  ctx: EmulatorContext<State>,
  packet: IPv4Packet,
) {
  if (packet.protocol !== ProtocolCode.tcp)
    throw "Why did this function get a non tcp packet?";
  const tcpPacket = TcpSerializer.fromBytes(packet.payload);
  const connectionState = ctx.state.tcpSockets_t.get(tcpPacket.destination);
  if (!connectionState) return;

  const destroySocket = () => {
    ctx.state.tcpSockets_t.delete(tcpPacket.destination);
  };
  const osCallback = () => {
    try {
      connectionState.callback(ctx, tcpPacket.destination, tcpPacket.payload);
    } catch (e) {
      console.log(e);
    }
  };
  const answerWith = (tcpPacket: TCPPacket) =>
    sendIPv4Packet(
      ctx,
      packet.source,
      ProtocolCode.tcp,
      TcpSerializer.toBuffer(tcpPacket),
    );

  switch (connectionState.state) {
    case "listen": {
      if (tcpPacket.flags != TCPFlag.syn) return destroySocket();
      const answer = synAckPacket(tcpPacket);
      ctx.state.tcpSockets_t.set(tcpPacket.destination, {
        state: "syn_recved",
        address: packet.source,
        callback: connectionState.callback,
        port: tcpPacket.source,
        seq: answer.seq!,
        ack: answer.ack!,
      });
      answerWith(answer);
      break;
    }
    case "syn_sent": {
      if (tcpPacket.flags != (TCPFlag.syn | TCPFlag.ack))
        return destroySocket();

      const answer = ackPacket(tcpPacket);
      connectionState.ack = answer.ack!;
      answerWith(answer);
      connectionState.state = "connected";
      osCallback();
      break;
    }
    case "syn_recved": {
      if (tcpPacket.flags != TCPFlag.ack) return destroySocket();
      connectionState.state = "accepted";
      osCallback();
      break;
    }
    case "accepted":
      if (tcpPacket.flags & TCPFlag.fin) {
        connectionState.state = "closing";
        osCallback();
        ctx.state.tcpSockets_t.set(tcpPacket.destination, {
          state: "listen",
          callback: connectionState.callback,
        });
        break;
      }
    case "connected":
      if (tcpPacket.flags & TCPFlag.fin) {
        connectionState.state = "closing";
        osCallback();
        destroySocket();
        break;
      }
      // Packets are obviously not missing and in order
      connectionState.ack = tcpPacket.seq;
      osCallback();
      break;
  }
}
