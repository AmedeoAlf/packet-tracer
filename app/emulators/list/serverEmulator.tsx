import { hello } from "../../virtualPrograms/hello";
import { interfacesL3 } from "../../virtualPrograms/interfacesl3";
import { l2send } from "../../virtualPrograms/l2send";
import { ping } from "../../virtualPrograms/ping";
import { DeviceEmulator, EmulatorContext } from "../DeviceEmulator";
import { arptable } from "@/app/virtualPrograms/arptable";
import { udpSend } from "@/app/virtualPrograms/udpSend";
import { OSInternalState, TCPCallback } from "@/app/devices/list/Computer";
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
import { isError, OSDir, readFile, readSettingsFile } from "../utils/osFiles";
import {
  DNSPacket,
  DNSResponsePacket,
  ResourceRecord,
  ResponseCode as DnsResponseCode,
} from "@/app/protocols/dns_emu";
import { sendIPv4Packet } from "../utils/sendIPv4Packet";
import { OSUDPPacket, tcpPacketHandler } from "./computerEmulator";
import { readUDP, listenAndAcceptTCP, send } from "../utils/sockets";
import {
  HttpRequest,
  HttpResponse,
  ResponseCode as HttpResponseCode,
} from "@/app/protocols/http";

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
    try {
      const packet = recvIPv4Packet(ctx, data, intf);
      if (packet) serverPacketHandler(ctx, packet);
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
      }
      break;
    case ProtocolCode.tcp:
      tcpPacketHandler(ctx, packet);
  }
  ctx.updateState();
}

function dnsPacketHandler(
  ctx: EmulatorContext<OSInternalState>,
  udpPacket: OSUDPPacket,
  ipSource: IPv4Address,
) {
  const config = readSettingsFile(ctx.state.filesystem, "/etc/dnsserver");
  if (!config) {
    ctx.write("Missing configuration file /etc/dnsserver");
    return;
  }
  if (typeof config.domains !== "object") {
    ctx.write("dns config should contain a domains property");
    return;
  }

  const dnsPacket = DNSPacket.fromBytes(udpPacket.payload);
  if (dnsPacket instanceof DNSResponsePacket) return;

  let code = DnsResponseCode.NoError;
  const answers = dnsPacket.questions
    .map((q) => {
      if (!Array.isArray(config.domains[q.name])) {
        code = DnsResponseCode.NXDomain;
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
      udpPacket.toPort,
      udpPacket.fromPort,
      response.toBytes(),
    ).toBytes(),
  );
}

const httpRequestHandler: TCPCallback = (ctx, socket, payload) => {
  const request = HttpRequest.fromBytes(payload);

  if (!(request instanceof HttpRequest)) return;

  if (request.method !== "GET") {
    send(
      ctx,
      socket,
      new HttpResponse(
        Buffer.from("This server only accepts GET http requests"),
        HttpResponseCode.BAD_REQUEST,
      ).toBytes(),
    );
    return;
  }

  const settings = readSettingsFile(ctx.state.filesystem, "/etc/http");
  const root = settings?.dir ?? "";

  const file = readFile(root + ctx.state.filesystem, request.resource);
  const response = isError(file)
    ? new HttpResponse(
        Buffer.from(
          `<h1>404 - File not found</h1><p>Could not find file ${request.resource}</p>`,
        ),
        HttpResponseCode.NOT_FOUND,
      )
    : new HttpResponse(Buffer.from(file));
  send(ctx, socket, response.toBytes());
};

export function serverInitServices(state: OSInternalState) {
  const dnsserver = readFile(state.filesystem, "/etc/dnsserver");
  if (!isError(dnsserver)) {
    const settings = JSON.parse(dnsserver);
    if (settings.on) {
      readUDP(
        state,
        ([ctx, packet]) => {
          dnsPacketHandler(ctx, packet, packet.from);
          return false;
        },
        53,
      );
    }
  }

  const httpserver = readFile(state.filesystem, "/etc/http");
  if (!isError(httpserver)) {
    const settings = JSON.parse(httpserver);
    if (settings.on) {
      listenAndAcceptTCP(state, 80, httpRequestHandler);
    }
  }
}
