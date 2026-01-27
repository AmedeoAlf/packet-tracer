import { OSInternalState } from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import { readFile } from "./osFiles";
import { IPv4Address, ipv4ToString, parseIpv4, ProtocolCode } from "@/app/protocols/rfc_760";
import { readUDP } from "./sockets";
import { DNSPacket, DNSQueryPacket, DNSQuestion, DNSResponsePacket, ResponseCode, RRType } from "@/app/protocols/dns_emu";
import { UDPPacket } from "@/app/protocols/udp";
import { sendIPv4Packet } from "./sendIPv4Packet";

export function getDns(ctx: Pick<EmulatorContext<OSInternalState>, "write" | "state">): IPv4Address | undefined {
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

export async function resolveAddresses(ctx: EmulatorContext<OSInternalState>, dns: IPv4Address, dnsQuestions: DNSQuestion[]) {
    return new Promise((resolve, reject) => {
        const port = readUDP(ctx.state, (ctx, packet) => {
            if (packet.from != dns) {
                return false;
            }
            const dnsPacket = DNSPacket.fromBytes(packet.payload);
            if (!(dnsPacket instanceof DNSResponsePacket)) return false;
            if (dnsPacket.responseCode != ResponseCode.NoError) {
                reject(`Server returned error ${dnsPacket.responseCode}`)
                return true;
            }
            const answers = dnsPacket.answers.map((a) => {
                switch (a.type) {
                    case RRType.A:
                        return [...new Uint32Array(a.rdata)]
                    default:
                        return a
                }
            })
            resolve(answers);
            return true;
        });
        const query = new DNSQueryPacket(0, dnsQuestions);
        const udpPacket = new UDPPacket(port, 53, query.toBytes())
        sendIPv4Packet(ctx as any, dns, ProtocolCode.udp, udpPacket.toBytes());
    })
}