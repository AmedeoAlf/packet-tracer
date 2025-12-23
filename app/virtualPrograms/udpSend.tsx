import { Command } from "../emulators/DeviceEmulator";
import { L3InternalState, parseIpv4, ProtocolCode, sendIPv4Packet } from "../protocols/rfc_760";
import { UDPPacket } from "../protocols/udp";

export function udpSend<T extends L3InternalState<object>>() {
  return {
    desc: "Destination ip",
    autocomplete: () => [],
    validate(_, past) {
      return parseIpv4(past[1]) !== undefined;
    },
    then: {
      desc: "Source port",
      autocomplete: () => [],
      validate(_, past) {
        const port = +past[2];
        return !Number.isNaN(port) && 0 <= port && port <= 0xFFFF;
      },
      then: {
        desc: "Destination port",
        autocomplete: () => [],
        validate(_, past) {
          const port = +past[3];
          return !Number.isNaN(port) && 0 <= port && port <= 0xFFFF;
        },
        then: {
          desc: "Payload (raw)",
          run(ctx) {
            const toIp = parseIpv4(ctx.args![1])!;
            sendIPv4Packet(
              ctx.state,
              ctx.sendOnIf,
              toIp,
              ProtocolCode.udp,
              new UDPPacket(
                +ctx.args![2],
                +ctx.args![3],
                Buffer.from(ctx.args![4])
              ).toBytes()
            );
          },
        }
      }
    },
  } satisfies Command<T>;
}
