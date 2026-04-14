import { OSInternalState } from "../devices/list/Computer";
import { EmulatorContext, SubCommand } from "../emulators/DeviceEmulator";
import { getDns, resolveAddressSimple } from "../emulators/utils/dnsUtils";
import { send, recv, close, dialTCP } from "../emulators/utils/sockets";
import { HttpRequest, HttpResponse } from "../protocols/http";
import { IPv4Address, parseIpv4 } from "../protocols/rfc_760";

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
      const [address, resource] = encodeURI(ctx.args![1]).split("/");
      const ip = parseIpv4(address);

      // The user passed an IP as destination, no DNS needed
      if (typeof ip !== 'undefined') {
        curlRequest(ctx, ip, resource);
        return;
      }

      const dns = getDns(ctx);
      if (typeof dns == 'undefined') {
        ctx.write("Configure dns to resolve server addresses (write the ip in /etc/dns)");
        return;
      }
      resolveAddressSimple(ctx, dns, address, (ctx, ip, error) => {
        if (typeof error == "string") {
          ctx.write("ERROR: " + error);
          return;
        }
        curlRequest(ctx, ip, resource, address);
      });
    },
  },
} satisfies SubCommand<OSInternalState>;

function curlRequest(ctx: EmulatorContext<OSInternalState>, ip: IPv4Address, resource: string, domain?: string) {
  const socket = dialTCP(ctx, ip, 80, (ctx, socket) => {
    send(
      ctx,
      socket,
      new HttpRequest("/" + resource, {
        "user-agent": "curl",
        "host": domain
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
}
