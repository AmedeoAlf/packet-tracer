import { SubCommand } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";
import { ipv4ToString, L3InternalState } from "../protocols/rfc_760";

export const arptable = <
  State extends L3InternalState<State>,
>(): SubCommand<State> => ({
  desc: "Dumps the device ARP table",
  done: true,
  run: (ctx) =>
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
});
