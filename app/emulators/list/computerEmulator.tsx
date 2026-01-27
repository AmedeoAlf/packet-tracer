import { ARPPacket } from "@/app/protocols/rfc_826";
import { Layer2Packet, MAC_BROADCAST } from "../../protocols/802_3";
import { ICMPPacket, ICMPType } from "../../protocols/icmp";
import {
  getMatchingInterface,
  IPv4Address,
  PartialIPv4Packet,
  ProtocolCode,
} from "../../protocols/rfc_760";
import { hello } from "../../virtualPrograms/hello";
import { interfacesL3 } from "../../virtualPrograms/interfacesl3";
import { l2send } from "../../virtualPrograms/l2send";
import { ping } from "../../virtualPrograms/ping";
import { DeviceEmulator } from "../DeviceEmulator";
import { arptable } from "@/app/virtualPrograms/arptable";
import { udpSend } from "@/app/virtualPrograms/udpSend";
import { UDPPacket } from "@/app/protocols/udp";
import { OSInternalState } from "@/app/devices/list/Computer";
import { handleArpPacket } from "../utils/handleArpPacket";
import { sendIPv4Packet } from "../utils/sendIPv4Packet";
import { nslookup } from "@/app/virtualPrograms/nslookup";
import { cat } from "@/app/virtualPrograms/cat";
import { writeFile } from "@/app/virtualPrograms/writeFile";
import { ls } from "@/app/virtualPrograms/ls";

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
    const l2Packet = Layer2Packet.fromBytes(data);
    if (l2Packet.type() == "arp") {
      handleArpPacket(ctx as any, ARPPacket.fromL2(l2Packet), intf);
      return;
    }
    try {
      const destination = PartialIPv4Packet.getDestination(l2Packet.payload);
      const isDestinedInterface = ctx.state.l3Ifs.findIndex(
        (v) => v && v.ip == destination,
      );

      // Non è indirizzato a me?
      if (isDestinedInterface == -1) {
        const sendTo = getMatchingInterface(ctx.state.l3Ifs, destination);
        // Devo (posso?) fare routing?
        if (sendTo != -1 && sendTo != intf) {
          l2Packet.from = ctx.state.netInterfaces[intf].mac;
          l2Packet.to = MAC_BROADCAST;
          ctx.sendOnIf(sendTo, l2Packet.toBytes());
        }
        return;
      }

      let packet = new PartialIPv4Packet(l2Packet.payload);
      if (!packet.isPayloadFinished()) {
        const packets = ctx.state.ipPackets;
        if (!ctx.state.ipPackets.has(packet.id)) {
          packets.set(packet.id, packet);
        } else {
          packets.get(packet.id)!.add(l2Packet.payload);
        }
        packet = packets.get(packet.id)!;
        if (!packet.isPayloadFinished()) {
          ctx.updateState();
          return;
        }
        // Il payload è concluso, elimina il pacchetto dalla coda
        packets.delete(packet.id);
      }

      switch (packet.protocol) {
        case ProtocolCode.icmp:
          const icmpPacket = ICMPPacket.fromBytes(packet.payload);
          // Gestisci i pacchetti echo ICMP
          switch (icmpPacket.type) {
            case ICMPType.echoRequest:
              sendIPv4Packet(
                ctx as any,
                packet.source,
                ProtocolCode.icmp,
                ICMPPacket.echoResponse(icmpPacket).toBytes(),
              );
            default:
              if (ctx.state.rawSocketFd) ctx.state.rawSocketFd(ctx, packet);
          }
        case ProtocolCode.udp:
          const udpPacket = UDPPacket.fromBytes(packet.payload);
          ctx.state.udpSockets.get(udpPacket.destination)?.call(null, [
            ctx,
            {
              from: packet.source,
              fromPort: udpPacket.source,
              toPort: udpPacket.destination,
              payload: udpPacket.payload,
            },
          ]);
      }
      ctx.updateState();
    } catch (e) {
      console.log(e);
    }
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
