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
  }
  ctx.updateState();
}
