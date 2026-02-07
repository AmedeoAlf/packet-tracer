import { SubCommand } from "../emulators/DeviceEmulator";
import { sendIPv4Packet } from "../emulators/utils/sendIPv4Packet";
import {
  L3InternalStateBase,
  parseIpv4,
  ProtocolCode,
} from "../protocols/rfc_760";
import { UDPPacket } from "../protocols/udp";

export const udpSend = {
  desc: "Sends and UDP packet",
  paramDesc: "Destination ip",
  autocomplete: () => [],
  validate(_, past) {
    return parseIpv4(past[1]) !== undefined;
  },
  then: {
    paramDesc: "Source port",
    autocomplete: () => [],
    validate(_, past) {
      const port = +past[2];
      return !Number.isNaN(port) && 0 <= port && port <= 0xffff;
    },
    then: {
      paramDesc: "Destination port",
      autocomplete: () => [],
      validate(_, past) {
        const port = +past[3];
        return !Number.isNaN(port) && 0 <= port && port <= 0xffff;
      },
      then: {
        paramDesc: "Payload (raw)",
        autocomplete: () => [],
        validate: () => true,
        then: {
          done: true,
          run(ctx) {
            const toIp = parseIpv4(ctx.args![1])!;
            sendIPv4Packet(
              ctx,
              toIp,
              ProtocolCode.udp,
              new UDPPacket(
                +ctx.args![2],
                +ctx.args![3],
                Buffer.from(ctx.args!.at(4) ?? []),
              ).toBytes(),
            );
          },
        },
      },
    },
  },
} satisfies SubCommand<L3InternalStateBase>;
