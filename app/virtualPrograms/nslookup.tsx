import { OSInternalState } from "../devices/list/Computer";
import { SubCommand, EmulatorContext } from "../emulators/DeviceEmulator";
import { getDns } from "../emulators/utils/dnsUtils";
import { sendIPv4Packet } from "../emulators/utils/sendIPv4Packet";
import { readUDP } from "../emulators/utils/sockets";
import { DNSPacket, DNSQueryPacket, DNSQuestion, DNSResponsePacket, ResponseCode, RRType } from "../protocols/dns_emu";
import { ipv4ToString, ProtocolCode } from "../protocols/rfc_760";
import { UDPPacket } from "../protocols/udp";

// NOTE: does not check packet ids
export const nslookup = {
    desc: 'Resolves a domain',
    validate: () => true,
    autocomplete: () => [],
    paramDesc: 'Domain to resolve',
    then: {
        run(ctx: EmulatorContext<OSInternalState>) {
            const dns = getDns(ctx);
            if (dns === undefined) return;
            ctx.write(`Server ${ipv4ToString(dns)}`);
            const port = readUDP(ctx.state, (ctx, packet) => {
                const dnsPacket = DNSPacket.fromBytes(packet.payload);
                if (!(dnsPacket instanceof DNSResponsePacket)) return;
                if (dnsPacket.responseCode != ResponseCode.NoError) {
                    ctx.write(`Server returned error ${dnsPacket.responseCode}`)
                    return;
                }
                for (const answer of dnsPacket.answers) {
                    switch (answer.type) {
                        case RRType.A:
                            const ips = [...new Uint32Array(answer.rdata)]
                                .map(ip => ipv4ToString(ip))
                                .join(" ");
                            ctx.write(`${answer.name}: TYPE A, ${ips}`);
                        default:
                            ctx.write(`Unknown response type for ${answer.name} (${answer.type})`);
                    }
                }
            });
            const question = new DNSQuestion(ctx.args![1]);
            const query = new DNSQueryPacket(0, [question]);
            const udpPacket = new UDPPacket(port, 53, query.toBytes())
            sendIPv4Packet(ctx as any, dns, ProtocolCode.udp, udpPacket.toBytes());
        },
    }
} satisfies SubCommand<OSInternalState>;
