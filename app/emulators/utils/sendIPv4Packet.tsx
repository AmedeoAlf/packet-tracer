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

export function sendIPv4Packet(
  ctx: Pick<
    EmulatorContext<L3InternalState<object>>,
    "state" | "sendOnIf" | "schedule"
  >,
  destination: IPv4Address,
  protocol: ProtocolCode,
  data: Buffer,
  ttl: number = 255,
): boolean {
  const { targetIp, intf, ok } = targetIP(ctx.state, destination);
  if (!ok) return false;

  const packet = new IPv4Packet(
    protocol,
    data,
    ctx.state.l3Ifs[intf].ip,
    destination,
    ttl,
  );

  if (!ctx.state.macTable.has(targetIp)) {
    ctx.sendOnIf(
      intf,
      new ARPPacket(
        ctx.state.netInterfaces[intf].mac,
        ctx.state.l3Ifs[intf].ip,
        targetIp,
      )
        .toL2()
        .toBytes(),
    );
    ctx.state.packetsWaitingForARP.push(packet);
    ctx.schedule(10, (ctx: EmulatorContext<L3InternalState<object>>) => {
      ctx.state.packetsWaitingForARP = ctx.state.packetsWaitingForARP.filter(
        (it) => it.destination != destination,
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
        ctx.state.macTable.get(targetIp),
      ).toBytes(),
    );
  }
  return true;
}
