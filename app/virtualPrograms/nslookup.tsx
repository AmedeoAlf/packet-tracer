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
      resolveAddresses(
        ctx,
        dns,
        [new DNSQuestion(ctx.args![1])],
        (ctx, answers, error) => {
          if (error) {
            ctx.write(error);
          } else {
            ctx.write(
              answers
                .filter((it) => Array.isArray(it))
                .map(
                  ([name, ips]) =>
                    `${name}: ${ips.map(ipv4ToString).join(" ")}`,
                )
                .join("\n"),
            );
          }
        },
      ).catch((e) => console.log("Got error in resolveAddresses", e));
    },
  },
} satisfies SubCommand<OSInternalState>;
