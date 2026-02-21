import { OSInternalState } from "../devices/list/Computer";
import { SubCommand } from "../emulators/DeviceEmulator";
import { send, close, dialTCP } from "../emulators/utils/sockets";
import { parseIpv4 } from "../protocols/rfc_760";

export const tcphello = {
  desc: 'Establishes a tcp connection, sends a packet with "Hello!", then closes the connection',
  paramDesc: "Address",
  autocomplete: () => [],
  validate: (_, past) => typeof parseIpv4(past[1]) != "undefined",
  then: {
    autocomplete: () => [],
    validate: (_, past) => {
      const port = +past[2];
      if (isNaN(port)) return false;
      return 0 < port && port <= 0xffff;
    },
    paramDesc: "Port to send to",
    then: {
      run(ctx) {
        const ip = parseIpv4(ctx.args![1])!;
        const port = +ctx.args![2];
        const socket = dialTCP(ctx, ip, port, (ctx, socket) => {
          send(ctx, socket, Buffer.from("Hello!"));
          close(ctx, socket);
        });
        ctx.schedule(50, (ctx) => {
          const state = ctx.state as OSInternalState;
          if (!state.tcpSockets_t.has(socket)) return;
          ctx.write("Could not establish/terminate connection");
          close(ctx, socket);
        });
      },
      done: true,
    },
  },
} satisfies SubCommand<OSInternalState>;
