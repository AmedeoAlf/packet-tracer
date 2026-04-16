import { EmulatorContext, SubCommand } from "../emulators/DeviceEmulator";
import { sendIPv4Packet } from "../emulators/utils/sendIPv4Packet";
import {
  echoRequest,
  echoResponseHeader,
  ICMPPacketSerializer,
} from "../protocols/icmp";
import {
  parseIpv4,
  ipv4ToString,
  L3InternalState,
  ProtocolCode,
} from "../protocols/rfc_760";

export const ping = {
  desc: "Sends an echo request",
  paramDesc: "Target IP",
  autocomplete: () => [],
  validate: (_, past) => parseIpv4(past[1]) !== undefined,
  then: {
    done: true,
    run(ctx: EmulatorContext<L3InternalState>) {
      const addr = parseIpv4(ctx.args![1])!;
      const start = ctx.currTick;
      let done = false;
      ctx.state.rawSocketFd_t = (ctx, packet) => {
        done = true;
        const seq = echoResponseHeader(
          ICMPPacketSerializer.fromBytes(packet.payload),
        ).seq;
        ctx.write(
          `From ${ipv4ToString(packet.source)}: icmp_seq=${seq} ttl=${packet.ttl} time=${ctx.currTick - start} ms`,
        );
        ctx.state.rawSocketFd_t = undefined;
      };
      const req = ICMPPacketSerializer.toBuffer(
        echoRequest(0, 0, Buffer.alloc(0)),
      );
      sendIPv4Packet(ctx, addr, ProtocolCode.icmp, req);
      ctx.schedule(100, (ctx) => {
        if (!done) {
          ctx.state.rawSocketFd_t = undefined;
          ctx.write("Request timeout");
        }
      });
    },
  },
} satisfies SubCommand<L3InternalState>;
