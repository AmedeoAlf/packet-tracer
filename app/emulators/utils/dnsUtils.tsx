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
import { UDPPacket } from "@/app/protocols/udp";
import { sendIPv4Packet } from "./sendIPv4Packet";

export function getDns(
  ctx: Pick<EmulatorContext<OSInternalState>, "write" | "state">,
): IPv4Address | undefined {
  const dnsStr = readFile(ctx.state.filesystem, "/etc/dns");
  if (typeof dnsStr != "string") {
    ctx.write("Can't find /etc/dns");
    return;
  }
  const dns = parseIpv4(dnsStr);
  if (dns === undefined) {
    ctx.write("DNS is configured improperly (edit /etc/dns)");
    return;
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
  const udpPacket = new UDPPacket(port, 53, query.toBytes());
  sendIPv4Packet(ctx as any, dns, ProtocolCode.udp, udpPacket.toBytes());
}
