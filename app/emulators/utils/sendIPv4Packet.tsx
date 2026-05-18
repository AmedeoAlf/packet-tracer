import {
  IPv4Address,
  IPv4Packet,
  L3InternalState,
  ProtocolCode,
  targetIP,
} from "@/app/protocols/rfc_760";
import { EmulatorContext } from "../DeviceEmulator";
import { arpToL2 } from "@/app/protocols/rfc_826";
import { filterObject } from "@/app/common";
import { EthernetFrameSerializer } from "@/app/protocols/802_3";

export function sendIPv4Packet<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  destination: IPv4Address,
  protocol: ProtocolCode,
  data: Buffer,
): boolean {
  const [ok, intf] = targetIP(ctx.state, destination);
  if (!ok) return false;

  const packet = new IPv4Packet(
    protocol,
    data,
    ctx.state.l3Ifs[intf]!.ip,
    destination,
  );

  return forwardIPv4Packet(ctx, packet, packet.destination);
}

export function forwardIPv4Packet<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  packet: IPv4Packet,
  destinationMACFrom: IPv4Address,
) {
  const [ok, intf, destIp] = targetIP(ctx.state, destinationMACFrom);
  if (!ok) return false;

  const ownIntf = destinationMACFrom === ctx.state.l3Ifs[intf]?.ip;

  const dst = ownIntf
    ? ctx.state.netInterfaces[intf].mac
    : ctx.state.netInterfaces[intf].type == "localhost"
      ? 0
      : ctx.state.macTable_t.get(destIp);

  if (typeof dst == "undefined") {
    ctx.sendOnIf(
      intf,
      EthernetFrameSerializer.toBuffer(
        arpToL2({
          senderIP: ctx.state.l3Ifs[intf]!.ip,
          targetIP: destIp,
          senderMAC: ctx.state.netInterfaces[intf].mac,
          targetMAC: 0,
        }),
      ),
    );
    ctx.state.packetsWaitingForARP_t[destIp] ??= [];
    ctx.state.packetsWaitingForARP_t[destIp].push(packet);
    ctx.schedule(50, (ctx: EmulatorContext<State>) => {
      ctx.state.packetsWaitingForARP_t = filterObject(
        ctx.state.packetsWaitingForARP_t,
        ([ip]) => +ip != destIp,
      );
    });
    return false;
  }

  const payloads = packet.toFragmentedBytes();
  for (const payload of payloads) {
    ctx.sendOnIf(
      intf,
      EthernetFrameSerializer.toBuffer({
        src: ctx.state.netInterfaces[intf].mac,
        payload,
        dst,
      }),
      ownIntf,
    );
  }
  return true;
}
