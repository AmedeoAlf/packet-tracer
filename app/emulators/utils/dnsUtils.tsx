import { OSInternalState } from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import { readFile } from "./osFiles";
import { IPv4Address, parseIpv4, ProtocolCode } from "@/app/protocols/rfc_760";
import { readUDP } from "./sockets";
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

export function getDns(
  filesystem: OSInternalState["filesystem"],
): IPv4Address | string {
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
export type ResolvedAddressesCallback = (
  ctx: EmulatorContext<OSInternalState>,
  answers: (ResolvedARecord | ResourceRecord)[],
  error?: string,
) => void;

export async function resolveAddresses(
  ctx: EmulatorContext<OSInternalState>,
  dns: IPv4Address,
  dnsQuestions: DNSQuestion[],
  callback: ResolvedAddressesCallback,
) {
  const port = readUDP(ctx.state, ([ctx, packet]) => {
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

export async function resolveAddressSimple(
  ctx: EmulatorContext<OSInternalState>,
  dns: IPv4Address,
  domain: string,
  callback: (
    ctx: EmulatorContext<OSInternalState>,
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
