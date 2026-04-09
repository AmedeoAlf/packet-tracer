import {
  IPv4Address,
  IPv4Packet,
  L3InternalState,
  ProtocolCode,
  targetIP,
} from "@/app/protocols/rfc_760";
import { EmulatorContext } from "../DeviceEmulator";
import { ARPPacket } from "@/app/protocols/rfc_826";
import { filterObject, throwString } from "@/app/common";
import { EthernetFrameSerializer } from "@/app/protocols/802_3";

export function sendIPv4Packet<State extends L3InternalState>(
  ctx: Pick<EmulatorContext<State>, "state" | "sendOnIf" | "schedule">,
  destination: IPv4Address,
  protocol: ProtocolCode,
  data: Buffer,
): boolean {
  const { intf, ok } = targetIP(ctx.state, destination);
  if (!ok) return false;

  const packet = new IPv4Packet(
    protocol,
    data,
    ctx.state.l3Ifs[intf]!.ip,
    destination,
  );

  return forwardIPv4Packet(ctx, packet, packet.destination);
}

export function forwardIPv4Packet<State extends L3InternalState>(
  ctx: Pick<EmulatorContext<State>, "state" | "sendOnIf" | "schedule">,
  packet: IPv4Packet,
  destinationMACFrom: IPv4Address,
) {
  const { targetIp, intf, ok } = targetIP(ctx.state, destinationMACFrom);
  if (!ok) return false;

  if (!ctx.state.macTable_t.has(targetIp)) {
    ctx.sendOnIf(
      intf,
      EthernetFrameSerializer.toBuffer(
        new ARPPacket(
          ctx.state.netInterfaces[intf].mac,
          ctx.state.l3Ifs[intf]!.ip,
          targetIp,
        ).toL2(),
      ),
    );
    ctx.state.packetsWaitingForARP_t[targetIp] ??= [];
    ctx.state.packetsWaitingForARP_t[targetIp].push(packet);
    ctx.schedule(50, (ctx: EmulatorContext<State>) => {
      ctx.state.packetsWaitingForARP_t = filterObject(
        ctx.state.packetsWaitingForARP_t,
        ([ip]) => +ip != targetIp,
      );
    });
    return false;
  }

  const payloads = packet.toFragmentedBytes();
  for (const p of payloads) {
    ctx.sendOnIf(
      intf,
      EthernetFrameSerializer.toBuffer({
        src: ctx.state.netInterfaces[intf].mac,
        dst:
          ctx.state.macTable_t.get(targetIp) ??
          throwString("How did I get here withouth an arp packet???"),
        payload: p,
      }),
    );
  }
  return true;
}
