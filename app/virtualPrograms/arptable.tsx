import { EmulatorContext, SubCommand } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";
import { ipv4ToString, L3InternalStateBase } from "../protocols/rfc_760";

export const arptable = {
  desc: "Dumps the device ARP table",
  done: true,
  run: (ctx: EmulatorContext<L3InternalStateBase>) =>
    ctx.write(
      ctx.state.macTable_t
        .entries()
        .map(
          ([ip, mac]) =>
            `${ipv4ToString(ip).padStart(16, " ")} => ${MACToString(mac)}`,
        )
        .toArray()
        .join("\n"),
    ),
} satisfies SubCommand<L3InternalStateBase>;
