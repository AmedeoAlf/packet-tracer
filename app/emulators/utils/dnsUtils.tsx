import { OSInternalState } from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import { readFile } from "./osFiles";
import { IPv4Address, parseIpv4 } from "@/app/protocols/rfc_760";

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