import { SubCommand } from "../emulators/DeviceEmulator";
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

export const ping = <
  State extends L3InternalState<State>,
>(): SubCommand<State> => ({
  desc: "Sends an echo request",
  paramDesc: "Target IP",
  autocomplete: () => [],
  validate: (_, past) => parseIpv4(past[1]) !== undefined,
  then: {
    done: true,
    run(ctx) {
      const addr = parseIpv4(ctx.args![1])!;
      const start = ctx.currTick;

      const timeout = ctx.schedule(1000, (ctx) => {
        ctx.state.rawSocketFd_t = undefined;
        ctx.write("Request timeout");
      });

      const req = ICMPPacketSerializer.toBuffer(
        echoRequest(0, 0, Buffer.alloc(0)),
      );

      sendIPv4Packet(ctx, addr, ProtocolCode.icmp, req);
      ctx.state.rawSocketFd_t = (ctx, packet) => {
        ctx.cancelSchedule(timeout);
        const seq = echoResponseHeader(
          ICMPPacketSerializer.fromBytes(packet.payload),
        ).seq;
        ctx.write(
          `From ${ipv4ToString(packet.source)}: icmp_seq=${seq} ttl=${packet.ttl} time=${ctx.currTick - start} ms`,
        );
        delete ctx.state.rawSocketFd_t;
      };
    },
  },
});
