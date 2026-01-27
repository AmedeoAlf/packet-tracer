import { OSInternalState } from "../devices/list/Computer";
import { SubCommand, EmulatorContext } from "../emulators/DeviceEmulator";
import { getDns, resolveAddresses } from "../emulators/utils/dnsUtils";
import { DNSQuestion } from "../protocols/dns_emu";
import { ipv4ToString } from "../protocols/rfc_760";

// NOTE: does not check packet ids
export const nslookup = {
  desc: "Resolves a domain",
  validate: () => true,
  autocomplete: () => [],
  paramDesc: "Domain to resolve",
  then: {
    run(ctx: EmulatorContext<OSInternalState>) {
      const dns = getDns(ctx);
      if (dns === undefined) return;
      ctx.write(`Server ${ipv4ToString(dns)}`);
      resolveAddresses(ctx, dns, [new DNSQuestion(ctx.args![1])]).then(
        ([ctx, answers]) => {
          ctx.write(
            answers
              .filter((it) => Array.isArray(it))
              .map(([name, ips]) => `${name}: ${ips.join(", ")}`)
              .join("\n"),
          );
        },
      );
    },
  },
} satisfies SubCommand<OSInternalState>;
