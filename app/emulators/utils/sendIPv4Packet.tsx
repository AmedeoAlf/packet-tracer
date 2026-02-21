import {
  IPv4Address,
  IPv4Packet,
  L3InternalState,
  ProtocolCode,
  targetIP,
} from "@/app/protocols/rfc_760";
import { EmulatorContext } from "../DeviceEmulator";
import { ARPPacket } from "@/app/protocols/rfc_826";
import { Layer2Packet } from "@/app/protocols/802_3";
import { filterObject } from "@/app/common";

// FIXME: accept OSInternalState properly
export function sendIPv4Packet(
  ctx: Pick<
    EmulatorContext<L3InternalState>,
    "state" | "sendOnIf" | "schedule"
  >,
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

export function forwardIPv4Packet(
  ctx: Pick<
    EmulatorContext<L3InternalState>,
    "state" | "sendOnIf" | "schedule"
  >,
  packet: IPv4Packet,
  destinationMACFrom: IPv4Address,
) {
  const { targetIp, intf, ok } = targetIP(ctx.state, destinationMACFrom);
  if (!ok) return false;

  if (!ctx.state.macTable_t.has(targetIp)) {
    ctx.sendOnIf(
      intf,
      new ARPPacket(
        ctx.state.netInterfaces[intf].mac,
        ctx.state.l3Ifs[intf]!.ip,
        targetIp,
      )
        .toL2()
        .toBytes(),
    );
    ctx.state.packetsWaitingForARP_t[targetIp] ??= [];
    ctx.state.packetsWaitingForARP_t[targetIp].push(packet);
    ctx.schedule(50, (ctx: EmulatorContext<L3InternalState>) => {
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
      new Layer2Packet(
        p,
        ctx.state.netInterfaces[intf].mac,
        ctx.state.macTable_t.get(targetIp),
      ).toBytes(),
    );
  }
  return true;
}
