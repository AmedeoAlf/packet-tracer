import { L3InternalStateBase } from "@/app/protocols/rfc_760";
import { EmulatorContext } from "../DeviceEmulator";
import { ARPPacket } from "@/app/protocols/rfc_826";
import { forwardIPv4Packet } from "./sendIPv4Packet";

export function handleArpPacket(
  ctx: EmulatorContext<L3InternalStateBase>,
  packet: ARPPacket,
  intf: number,
) {
  if (packet.response) {
    if (
      packet.targetMAC != ctx.state.netInterfaces[intf].mac ||
      packet.targetIP != ctx.state.l3Ifs[intf]!.ip
    )
      return;
    ctx.state.macTable_t.set(packet.senderIP, packet.senderMAC);
    for (const [ip, pending] of [
      ...Object.entries(ctx.state.packetsWaitingForARP_t),
    ]) {
      if (+ip == packet.senderIP) {
        for (const p of pending) forwardIPv4Packet(ctx, p, +ip);
        delete ctx.state.packetsWaitingForARP_t[+ip];
      }
    }
    ctx.updateState();
    return;
  }

  if (!ctx.state.l3Ifs[intf] || ctx.state.l3Ifs[intf].ip != packet.targetIP)
    return;

  ctx.state.macTable_t.set(packet.senderIP, packet.senderMAC);
  ctx.sendOnIf(
    intf,
    packet.respondWith(ctx.state.netInterfaces[intf].mac).toL2().toBytes(),
  );
  // ctx.updateState();

  return;
}
