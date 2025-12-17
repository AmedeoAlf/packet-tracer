import { Command } from "../emulators/DeviceEmulator";
import { ICMPPacket } from "../protocols/icmp";
import {
  parseIpv4,
  ipv4ToString,
  L3InternalState,
  ProtocolCode,
  sendIPv4Packet,
} from "../protocols/rfc_760";

export function ping<T extends L3InternalState<object>>() {
  return {
    desc: "Sends an echo request",
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
      desc: "The ip address to ping",
      run(ctx) {
        const addr = parseIpv4(ctx.args![1]);
        if (addr == undefined) {
          ctx.write(`Invalid address ${ctx.args![1]}`);
          return;
        }
        const start = Date.now();
        ctx.state.rawSocketFd = (packet) => {
          ctx.write(
            `From ${ipv4ToString(packet.source)}: icmp_seq=${ICMPPacket.fromBytes(packet.payload).echoResponseHeader().seq} ttl=${packet.ttl} time=${Date.now() - start} ms`,
          );
          ctx.state.rawSocketFd = undefined;
        };
        sendIPv4Packet(
          ctx.state,
          ctx.sendOnIf,
          addr,
          ProtocolCode.icmp,
          ICMPPacket.echoRequest(0, 0, Buffer.alloc(0)).toBytes(),
        );
      },
    },
  } satisfies Command<T>;
}
