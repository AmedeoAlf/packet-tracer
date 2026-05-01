import { OSInternalState } from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import { OSDir, readFile } from "./osFiles";
import { IPv4Address, parseIpv4, ProtocolCode } from "@/app/protocols/rfc_760";
import { readUDP, udpClose } from "./sockets";
import {
  DNSPacket,
  DNSQueryPacket,
  DNSQuestion,
  DNSResponsePacket,
  ResourceRecord,
  ResponseCode,
  RRType,
} from "@/app/protocols/dns_emu";
import { UDPSerializer } from "@/app/protocols/udp";
import { sendIPv4Packet } from "./sendIPv4Packet";

export function parseURL(
  str: string,
):
  | [
      protocol: string | undefined,
      hostname: string,
      port: number | undefined,
      resource: string | undefined,
    ]
  | undefined {
  const reg = str.match(/(\w*:\/\/)*([a-zA-Z0-9\.\-]+)(:\d+)*(\/.*)*/);
  if (reg == null) return;
  const protocol = reg.at(1)?.replace("://", "");

  const hostname = reg[2];
  if (!isResolvableToIP(hostname)) return;

  const portStr = reg.at(3)?.substring(1);
  const port = portStr ? +portStr : undefined;

  return [protocol, hostname, port, reg.at(4)];
}

export function getDns(filesystem: OSDir): IPv4Address | string {
  const dnsStr = readFile(filesystem, "/etc/dns");
  if (typeof dnsStr != "string") {
    return "File di configurazione non presente, esegui\nwriteFile /etc/dns 1.1.1.1";
  }
  const dns = parseIpv4(dnsStr);
  if (dns === undefined) {
    return "Indirizzo contenuto in /etc/dns non valido";
  }
  return dns;
}

export type ResolvedARecord = [string, IPv4Address[]];
export type ResolvedAddressesCallback<State extends OSInternalState<State>> = (
  ctx: EmulatorContext<State>,
  answers: (ResolvedARecord | ResourceRecord)[],
  error?: string,
) => void;

export async function resolveAddresses<State extends OSInternalState<State>>(
  ctx: EmulatorContext<State>,
  dns: IPv4Address,
  dnsQuestions: DNSQuestion[],
  callback: ResolvedAddressesCallback<State>,
) {
  // Set up timeout
  const timeout = ctx.schedule(1000, (ctx) => {
    ctx.write("No answer from DNS server");
    udpClose(ctx, port);
  });

  // Set up UDP callback
  const port = readUDP(ctx.state, ([ctx, packet]) => {
    ctx.cancelSchedule(timeout);
    if (packet.from != dns) {
      return false;
    }
    const dnsPacket = DNSPacket.fromBytes(packet.payload);
    if (!(dnsPacket instanceof DNSResponsePacket)) return false;
    if (dnsPacket.responseCode != ResponseCode.NoError) {
      callback(
        ctx,
        [],
        `Server returned error ${ResponseCode[dnsPacket.responseCode]}`,
      );
      return true;
    }
    const answers = dnsPacket.answers.map((a) => {
      const start = a.rdata.byteOffset;
      const asIntArray = new Uint32Array(
        a.rdata.buffer.slice(start, start + a.rdata.length),
      );
      switch (a.type) {
        case RRType.A:
          return [a.name, [...asIntArray]] as ResolvedARecord;
        default:
          return a;
      }
    });
    callback(ctx, answers);
    return true;
  });
  // Actually send the query
  const query = new DNSQueryPacket(0, dnsQuestions);
  sendIPv4Packet(
    ctx,
    dns,
    ProtocolCode.udp,
    UDPSerializer.toBuffer({
      source: port,
      destination: 53,
      payload: query.toBytes(),
    }),
  );
}

export async function resolveAddressSimple<
  State extends OSInternalState<State>,
>(
  ctx: EmulatorContext<State>,
  dns: IPv4Address,
  domain: string,
  callback: (
    ctx: EmulatorContext<State>,
    ip: IPv4Address,
    error?: string,
  ) => void,
) {
  await resolveAddresses(
    ctx,
    dns,
    [new DNSQuestion(domain)],
    (ctx, answers, err) => {
      if (typeof err == "string") {
        callback(ctx, 0, err);
        return;
      }
      const ans = answers.find((it) => Array.isArray(it) && it[0] == domain) as
        | ResolvedARecord
        | undefined;
      if (typeof ans == "undefined") {
        callback(ctx, 0, "Server did not send a response to domain");
      } else {
        callback(ctx, ans[1][0]);
      }
    },
  );
}

export function isResolvableToIP(str: string): boolean {
  if (typeof parseIpv4(str) == "number") return true;
  return str.match(/[^a-zA-Z\d\.]/) == null;
}
