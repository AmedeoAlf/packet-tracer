import { OSInternalState } from "../devices/list/Computer";
import { SubCommand } from "../emulators/DeviceEmulator";
import { serverInitServices } from "../emulators/list/serverEmulator";

export const reloadServices = {
  desc: "Reloads all configuration files for services",
  run: (ctx) => {
    serverInitServices(ctx.state);
    ctx.updateState();
  },
  done: true,
} satisfies SubCommand<OSInternalState>;
