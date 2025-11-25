import { Command } from "../emulators/DeviceEmulator";
import { Layer2Packet, MAC_BROADCAST } from "../protocols/802_3";
import { ICMPPacket } from "../protocols/icmp";
import { getMatchingInterface, parseIpv4, IPv4Packet, ipv4ToString, L3InternalState, ProtocolCode } from "../protocols/rfc_760";

export function ping<T extends L3InternalState<object>>() {
  return {
    desc: 'Sends an echo request',
    autocomplete() {
      return []
    },
    validate(_, past) {
      // TODO: "." è un ip valido
      return past[1].split(".").map(n => +n).every(it => 0 <= it && it < 256);
    },
    then: {
      desc: 'The ip address to ping',
      run(ctx) {
        const addr = parseIpv4(ctx.args!![1]);
        if (addr == undefined) {
          ctx.write(`Invalid address ${ctx.args!![1]}`);
          return;
        }
        // L'interfaccia su cui inviare il pacchetto
        let intf = getMatchingInterface(ctx.state.l3Ifs, addr);
        // Il pacchetto non è su una rete disponibile -> invia al gateway
        if (intf == -1) {
          intf = getMatchingInterface(ctx.state.l3Ifs, ctx.state.gateway);
          // Il gateway è invalido
          if (intf == -1) return;
        }
        const packet = new IPv4Packet(
          ProtocolCode.icmp,
          ICMPPacket.echoRequest(0, 0, new ArrayBuffer(0)).toBytes().buffer,
          ctx.state.l3Ifs[intf].ip,
          addr
        );
        const start = Date.now();
        ctx.state.rawSocketFd = (packet) => {
          ctx.write(
            `From ${ipv4ToString(packet.source)}: icmp_seq=${ICMPPacket.fromBytes(packet.payload).echoResponseHeader().seq} ttl=${packet.ttl} time=${Date.now() - start} ms`
          );
          ctx.state.rawSocketFd = undefined;
        }
        for (const p of packet.toFragmentedBytes()) {
          ctx.sendOnIf(
            intf,
            new Layer2Packet(
              p.buffer, ctx.state.netInterfaces[intf].mac, MAC_BROADCAST
            ).toBytes());
        }
      },
    }
  } satisfies Command<T>;
}
