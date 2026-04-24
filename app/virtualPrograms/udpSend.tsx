import { SubCommand } from "../emulators/DeviceEmulator";
import { sendIPv4Packet } from "../emulators/utils/sendIPv4Packet";
import { L3InternalState, parseIpv4, ProtocolCode } from "../protocols/rfc_760";
import { UDPSerializer } from "../protocols/udp";

export const udpSend = <
  State extends L3InternalState<State>,
>(): SubCommand<State> => ({
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
              UDPSerializer.toBuffer({
                source: +ctx.args![2],
                destination: +ctx.args![3],
                payload: Buffer.from(ctx.args!.at(4) ?? []),
              }),
            );
          },
        },
      },
    },
  },
});
