import { EmulatorContext, SubCommand } from "../emulators/DeviceEmulator";
import { ICMPPacket } from "../protocols/icmp";
import {
  parseIpv4,
  ipv4ToString,
  L3InternalState,
  ProtocolCode,
  sendIPv4Packet,
} from "../protocols/rfc_760";

export const ping = {
  desc: "Sends an echo request",
  paramDesc: "Target IP",
  autocomplete() {
    return [];
  },
  validate(_, past) {
    // TODO: "." è un ip valido
    return past[1]
      .split(".")
      .map((n) => +n)
      .every((it) => 0 <= it && it < 256);
  },
  then: {
    run(ctx: EmulatorContext<L3InternalState<object>>) {
      const addr = parseIpv4(ctx.args![1]);
      if (addr == undefined) {
        ctx.write(`Invalid address ${ctx.args![1]}`);
        return;
      }
      const start = Date.now();
      let done = false;
      ctx.state.rawSocketFd = (ctx, packet) => {
        done = true;
        const seq = ICMPPacket.fromBytes(packet.payload).echoResponseHeader()
          .seq;
        ctx.write(
          `From ${ipv4ToString(packet.source)}: icmp_seq=${seq} ttl=${packet.ttl} time=${Date.now() - start} ms`,
        );
        ctx.state.rawSocketFd = undefined;
      };
      const req = ICMPPacket.echoRequest(0, 0, Buffer.alloc(0)).toBytes();
      sendIPv4Packet(ctx, addr, ProtocolCode.icmp, req);
      ctx.schedule(15, (ctx) => {
        if (!done) {
          ctx.write("Request timeout");
        }
      });
    },
  },
} satisfies SubCommand<L3InternalState<object>>;
