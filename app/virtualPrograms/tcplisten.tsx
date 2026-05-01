import { OSInternalState } from "../devices/list/Computer";
import { SubCommand } from "../emulators/DeviceEmulator";
import { listenAndAcceptTCP, recv, tcpClose } from "../emulators/utils/sockets";

export const tcplisten = <
  State extends OSInternalState<State>,
>(): SubCommand<State> => ({
  desc: "Waits for a tcp connection and packet",
  autocomplete: () => [],
  validate: (_, past) => {
    const port = +past[1];
    if (isNaN(port)) return false;
    return 0 < port && port <= 0xffff;
  },
  paramDesc: "Port to listen from",
  then: {
    subcommands: {
      start: {
        desc: "Starts listening on port",
        run(ctx) {
          const port = +ctx.args![1];
          listenAndAcceptTCP(ctx.state, port, (ctx, socket) => {
            recv(ctx.state, socket, (ctx, data) => {
              ctx.write(data.toString());
              tcpClose(ctx, socket);
            });
          });
        },
        done: true,
      },
      stop: {
        desc: "Stops listening on port",
        run(ctx) {
          tcpClose(ctx, +ctx.args![1]);
        },
        done: true,
      },
    },
  },
});
