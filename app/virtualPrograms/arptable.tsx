import { SubCommand } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";
import { ipv4ToString, L3InternalState } from "../protocols/rfc_760";

export function arptable<T extends L3InternalState<object>>() {
  return {
    desc: "Dumps the device ARP table",
    run: (ctx) =>
      ctx.write(
        ctx.state.macTable
          .entries()
          .map(
            ([ip, mac]) =>
              `${ipv4ToString(ip).padStart(16, " ")} => ${MACToString(mac)}`,
          )
          .toArray()
          .join("\n"),
      ),
  } satisfies SubCommand<T>;
}
