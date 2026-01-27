import { hello } from "../../virtualPrograms/hello";
import { interfacesL3 } from "../../virtualPrograms/interfacesl3";
import { l2send } from "../../virtualPrograms/l2send";
import { ping } from "../../virtualPrograms/ping";
import { DeviceEmulator, EmulatorContext } from "../DeviceEmulator";
import { arptable } from "@/app/virtualPrograms/arptable";
import { udpSend } from "@/app/virtualPrograms/udpSend";
import { OSInternalState } from "@/app/devices/list/Computer";
import { nslookup } from "@/app/virtualPrograms/nslookup";
import { cat } from "@/app/virtualPrograms/cat";
import { writeFile } from "@/app/virtualPrograms/writeFile";
import { ls } from "@/app/virtualPrograms/ls";
import { recvIPv4Packet } from "../utils/recvIPv4Packet";
import {
  IPv4Address,
  IPv4Packet,
  parseIpv4,
  ProtocolCode,
} from "@/app/protocols/rfc_760";
import { UDPPacket } from "@/app/protocols/udp";
import { OSDir, readFile } from "../utils/osFiles";
import {
  DNSPacket,
  DNSResponsePacket,
  ResourceRecord,
  ResponseCode,
} from "@/app/protocols/dns_emu";
import { sendIPv4Packet } from "../utils/sendIPv4Packet";

export const defaultServerFS: OSDir = {
  etc: {
    dns: "",
    http: JSON.stringify({ on: false, dir: "/pub" }),
    dnsserver: JSON.stringify({
      on: false,
      domains: { "example.com": ["127.0.0.1", "127.0.0.2"] },
      fallback: ["1.1.1.1"],
    }),
  },
  pub: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Homepage</title>
  </head>
  <body>
    <h1>Welcome to the homepage</h1>
    <p>There is not much else to see...</p>
  </body>
</html>`,
  },
};

export const serverEmulator: DeviceEmulator<OSInternalState> = {
  configPanel: {
    wip() {
      return <>UI Work in progress</>;
    },
  },
  packetHandler(ctx, data, intf) {
    const packet = recvIPv4Packet(ctx, data, intf);
    if (!packet) return;
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

export function serverPacketHandler(
  ctx: EmulatorContext<OSInternalState>,
  packet: IPv4Packet,
) {
  switch (packet.protocol) {
    case ProtocolCode.udp:
      const udpPacket = UDPPacket.fromBytes(packet.payload);
      if (ctx.state.udpSockets.has(udpPacket.destination)) {
        const completed = ctx.state.udpSockets
          .get(udpPacket.destination)!
          .call(null, [
            ctx,
            {
              from: packet.source,
              fromPort: udpPacket.source,
              toPort: udpPacket.destination,
              payload: udpPacket.payload,
            },
          ]);
        if (completed) ctx.state.udpSockets.delete(udpPacket.destination);
      } else {
        switch (udpPacket.destination) {
          case 53:
            dnsPacketHandler(ctx, udpPacket, packet.source);
        }
      }
  }
  ctx.updateState();
}

function dnsPacketHandler(
  ctx: EmulatorContext<OSInternalState>,
  udpPacket: UDPPacket,
  ipSource: IPv4Address,
) {
  const dnsserverStr = readFile(ctx.state.filesystem, "/etc/dnsserver");
  if (typeof dnsserverStr != "string") return;
  const config = JSON.parse(dnsserverStr);
  if (!config.on) return;
  if (typeof config.domains != "object") return;

  const dnsPacket = DNSPacket.fromBytes(udpPacket.payload);
  if (dnsPacket instanceof DNSResponsePacket) return;

  let code = ResponseCode.NoError;
  const answers = dnsPacket.questions
    .map((q) => {
      if (!Array.isArray(config.domains[q.name])) {
        code = ResponseCode.NXDomain;
        return;
      }
      return q.answerTypeA(
        config.domains[q.name].map((ip: string) => parseIpv4(ip)),
      );
    })
    .filter((it) => it) as ResourceRecord[];

  const response = new DNSResponsePacket(
    dnsPacket.id,
    code,
    dnsPacket.questions,
    answers,
  );

  sendIPv4Packet(
    ctx as any,
    ipSource,
    ProtocolCode.udp,
    new UDPPacket(
      udpPacket.destination,
      udpPacket.source,
      response.toBytes(),
    ).toBytes(),
  );
}
