import { OSInternalState } from "../devices/list/Computer";
import { SubCommand } from "../emulators/DeviceEmulator";
import { send, recv, close, dialTCP } from "../emulators/utils/sockets";
import { HttpRequest, HttpResponse } from "../protocols/http";
import { parseIpv4 } from "../protocols/rfc_760";

export const curl = {
  desc: "Gets the content of a resource through http",
  autocomplete: () => [],
  paramDesc: "Address",
  validate() {
    // TODO: proper parsing
    return true;
  },
  then: {
    done: true,
    run(ctx) {
      const [address, resource] = decodeURI(ctx.args![1]).split("/");
      // TODO: resolve domain names and send Host param
      const socket = dialTCP(ctx, parseIpv4(address)!, 80, (ctx, socket) => {
        send(
          ctx,
          socket,
          new HttpRequest("/" + resource, {
            "user-agent": "curl",
          }).toBytes(),
        );
        recv(ctx.state, socket, (ctx, data) => {
          const response = HttpResponse.fromBytes(data);
          console.log("server answered", response);
          if (!(response instanceof HttpResponse)) return;
          ctx.write(response.body.toString());
          close(ctx, socket);
        });
      });
      ctx.schedule(50, (ctx) => close(ctx, socket));
    },
  },
} satisfies SubCommand<OSInternalState>;
