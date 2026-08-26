import { SwitchInternalState } from "../devices/list/Switch";
import { SubCommand } from "../emulators/DeviceEmulator";
import { MACToString } from "../protocols/802_3";

export const macTable = (): SubCommand<SwitchInternalState> => ({
  desc: "Access 'mac -> interface' table",
  run: (ctx) =>
    ctx.write(
      ctx.state.macTable_t
        .entries()
        .map(
          ([mac, intf]) =>
            `${MACToString(mac)} -> ${ctx.state.netInterfaces[intf].name}`,
        )
        .toArray()
        .join("\n"),
    ),
  subcommands: {
    clear: {
      desc: "Clears the table",
      run(ctx) {
        ctx.state.macTable_t.clear();
        ctx.updateState();
      },
      done: true,
    },
  },
});

export default macTable;
