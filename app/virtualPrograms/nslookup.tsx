import { OSInternalState } from "../devices/list/Computer";
import { SubCommand, EmulatorContext } from "../emulators/DeviceEmulator";
import { getDns, resolveAddresses } from "../emulators/utils/dnsUtils";
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
            // TODO
            // FINISH the code
            resolveAddresses(ctx, dns, [new DNSQuestion(ctx.args![1])]).then();
        },
    }
} satisfies SubCommand<OSInternalState>;
