import { OSInternalState } from "../devices/list/Computer";
import { EmulatorContext, SubCommand } from "../emulators/DeviceEmulator";
import {
  getDns,
  parseURL,
  resolveAddressSimple,
} from "../emulators/utils/dnsUtils";
import { send, recv, tcpClose, dialTCP } from "../emulators/utils/sockets";
import { HttpRequest, HttpResponse } from "../protocols/http";
import { IPv4Address, parseIpv4 } from "../protocols/rfc_760";

export const curl = <
  State extends OSInternalState<State>,
>(): SubCommand<State> => ({
  desc: "Gets the content of a resource through http",
  autocomplete: () => [],
  paramDesc: "Address",
  validate: (_, past) => typeof parseURL(past[1]) != "undefined",
  then: {
    done: true,
    run(ctx) {
      const [protocol, address, port, resource] = parseURL(ctx.args![1])!;
      if ((protocol ?? "http") != "http") {
        ctx.write("http:// is the only supported protocol");
        return;
      }
      const ip = parseIpv4(address);

      // The user passed an IP as destination, no DNS needed
      if (typeof ip !== "undefined") {
        curlRequest(ctx, ip, port, resource);
        return;
      }

      const dns = getDns(ctx.state.filesystem);
      if (typeof dns == "string") {
        ctx.write(dns);
        return;
      }
      resolveAddressSimple(ctx, dns, address, (ctx, ip, error) => {
        if (typeof error == "string") {
          ctx.write("ERROR: " + error);
          return;
        }
        curlRequest(ctx, ip, port, resource, address);
      });
    },
  },
});

function curlRequest<State extends OSInternalState<State>>(
  ctx: EmulatorContext<State>,
  ip: IPv4Address,
  port: number = 80,
  resource: string = "/",
  domain?: string,
) {
  const timeout = ctx.schedule(1000, (ctx) => {
    ctx.write("Nessuna risposta dal server");
    tcpClose(ctx, socket);
  });
  const socket = dialTCP(ctx, ip, port, (ctx, socket) => {
    send(
      ctx,
      socket,
      new HttpRequest("/" + resource, {
        "user-agent": "curl",
        host: domain,
      }).toBytes(),
    );
    recv(ctx.state, socket, (ctx, data) => {
      ctx.cancelSchedule(timeout);
      const response = HttpResponse.fromBytes(data);
      console.log("server answered", response);
      if (!(response instanceof HttpResponse)) return;
      ctx.write(response.body.toString());
      tcpClose(ctx, socket);
    });
  });
}
