import { L3InternalStateBase } from "@/app/protocols/rfc_760";
import { EmulatorContext } from "../DeviceEmulator";
import { ARPPacket } from "@/app/protocols/rfc_826";
import { sendIPv4Packet } from "./sendIPv4Packet";

export function handleArpPacket(
  ctx: EmulatorContext<L3InternalStateBase>,
  packet: ARPPacket,
  intf: number,
) {
  if (packet.response) {
    if (
      packet.targetMAC != ctx.state.netInterfaces[intf].mac ||
      packet.targetIP != ctx.state.l3Ifs[intf].ip
    )
      return;
    ctx.state.macTable.set(packet.senderIP, packet.senderMAC);
    const toRemove: number[] = [];
    for (const [i, pending] of ctx.state.packetsWaitingForARP.entries()) {
      if (pending.destination == packet.senderIP) {
        sendIPv4Packet(
          ctx,
          pending.destination,
          pending.protocol,
          pending.payload,
        );
        toRemove.push(i);
      }
    }
    ctx.state.packetsWaitingForARP.filter((_, i) => !toRemove.includes(i));
    ctx.updateState();
    return;
  }

  if (!ctx.state.l3Ifs[intf] || ctx.state.l3Ifs[intf].ip != packet.targetIP)
    return;

  ctx.state.macTable.set(packet.senderIP, packet.senderMAC);
  ctx.sendOnIf(
    intf,
    packet.respondWith(ctx.state.netInterfaces[intf].mac).toL2().toBytes(),
  );
  // ctx.updateState();

  return;
}
