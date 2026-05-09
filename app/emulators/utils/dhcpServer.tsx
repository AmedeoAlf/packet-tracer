import { throwString } from "@/app/common";
import {
  DHCPPacket,
  DHCPSerializer,
  makeDHCPAck,
  makeDHCPOffer,
  MessageType,
  TLVCode,
  tlvField,
} from "@/app/protocols/dhcp";
import {
  IPv4Address,
  IPv4Packet,
  L3InternalState,
  ProtocolCode,
} from "@/app/protocols/rfc_760";
import { EmulatorContext } from "../DeviceEmulator";
import {
  EthernetFrameSerializer,
  EtherType,
  MacAddress,
} from "@/app/protocols/802_3";
import { UDPSerializer } from "@/app/protocols/udp";

// NOTE: dhcp xId is not checked...
// NOTE: we do not respect leases, like at all

export type DHCPSettings = {
  network: IPv4Address;
  mask: IPv4Address;
  excluded: [IPv4Address, IPv4Address][];
  gateway: IPv4Address;
  dns: IPv4Address;
};

export type DHCPState = {
  assigned: Set<IPv4Address>;
  pending: Set<IPv4Address>;
};

// assumes ip to come from right network
export const isIpFree = (
  { excluded }: DHCPSettings,
  { assigned, pending }: DHCPState,
  ip: IPv4Address,
): boolean =>
  !assigned.has(ip) &&
  !pending.has(ip) &&
  !excluded.some(([min, max]) => min <= ip && ip <= max);

function dhcpAllocRequested<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  settings: DHCPSettings,
  state: DHCPState,
  forMac: MacAddress,
  ip: IPv4Address,
): boolean {
  if (
    (ip & settings.mask) != (settings.network & settings.mask) ||
    !isIpFree(settings, state, ip)
  )
    return false;
  state.pending.add(ip);
  ctx.state.macTable_t.set(ip, forMac);
  return true;
}

function dhcpAlloc<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  settings: DHCPSettings,
  state: DHCPState,
  forMac: MacAddress,
): IPv4Address | undefined {
  const maxIp = settings.network + ~settings.mask;
  for (let ip = settings.network; ip <= maxIp; ip++) {
    if (dhcpAllocRequested(ctx, settings, state, forMac, ip)) return ip;
  }
}

function dhcpFinalize(
  { assigned: assigned_t, pending: pending_t }: DHCPState,
  ip: IPv4Address,
) {
  if (!pending_t.delete(ip)) throw "Finalizing a non pending ip";
  assigned_t.add(ip);
}

function dhcpCancel<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  { pending: pending_t }: DHCPState,
  ip: IPv4Address,
) {
  if (pending_t.delete(ip)) {
    ctx.state.macTable_t.delete(ip);
  }
}

export function dhcpFree<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  { assigned: assigned_t }: DHCPState,
  ip: IPv4Address,
) {
  if (assigned_t.delete(ip)) {
    ctx.state.macTable_t.delete(ip);
  }
}

export function handleDHCPPacket<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  settings: DHCPSettings,
  state: DHCPState,
  fromIntf: number,
  dhcpData: Buffer,
) {
  {
    if (!ctx.state.l3Ifs[fromIntf]) return;
    const { ip, mask } = ctx.state.l3Ifs[fromIntf];
    if ((ip & mask) != (settings.network & settings.mask)) return;
  }
  const serverAddr = ctx.state.l3Ifs[fromIntf].ip;

  const dhcpPkt = DHCPSerializer.fromBytes(dhcpData);
  const messageType: MessageType = (
    tlvField(dhcpPkt, TLVCode.messageType) ??
    throwString("No messageType header")
  ).readUInt8();

  const sourceMac =
    dhcpPkt.cHAddr!.readUInt32BE() * 2 ** 16 + dhcpPkt.cHAddr!.readUInt16BE(4);

  const sendDHCP = (packet: DHCPPacket) => dhcpAnswer(ctx, packet, fromIntf);
  switch (messageType) {
    case MessageType.discover:
      const requestIp = tlvField(dhcpPkt, TLVCode.requestIp)?.readUint32BE();
      const offered =
        typeof requestIp == "undefined"
          ? dhcpAlloc(ctx, settings, state, sourceMac)
          : dhcpAllocRequested(ctx, settings, state, sourceMac, requestIp)
            ? requestIp
            : undefined;
      if (typeof offered != "number") throw "No IP could have been allocated";

      sendDHCP(
        makeDHCPOffer({
          router: settings.gateway,
          dnsServers: [settings.dns],
          subnet: settings.mask,
          from: dhcpPkt,
          offered,
          serverAddr,
        }),
      );

      ctx.schedule(1000, (ctx) => {
        dhcpCancel(ctx, state, offered);
      });

      break;
    case MessageType.request:
      if (dhcpPkt.sIAddr != serverAddr) return;
      const pktServerAddr = tlvField(
        dhcpPkt,
        TLVCode.dhcpServer,
      )?.readUInt32BE();
      if (typeof pktServerAddr == "number" && pktServerAddr != serverAddr)
        return;
      const requestedIp = tlvField(dhcpPkt, TLVCode.requestIp)?.readUInt32BE();
      if (typeof requestedIp == "undefined") return;
      if (!state.pending.has(requestedIp)) return;

      dhcpFinalize(state, requestedIp);
      sendDHCP(
        makeDHCPAck({
          router: settings.gateway,
          dnsServers: [settings.dns],
          subnet: settings.mask,
          from: dhcpPkt,
          offered: requestedIp,
          serverAddr,
        }),
      );
      break;
  }
}

function dhcpAnswer<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  packet: DHCPPacket,
  fromIntf: number,
) {
  const ipPkt = new IPv4Packet(
    ProtocolCode.udp,
    UDPSerializer.toBuffer({
      payload: DHCPSerializer.toBuffer(packet),
      destination: 68,
      source: 67,
    }),
    ctx.state.l3Ifs[fromIntf]!.ip,
    packet.yIAddr!,
  );
  const payloads = ipPkt.toFragmentedBytes();
  for (const payload of payloads) {
    ctx.sendOnIf(
      fromIntf,
      EthernetFrameSerializer.toBuffer({
        lenOrEtherType: EtherType.dhcp,
        dst:
          ctx.state.macTable_t.get(packet.yIAddr!) ??
          throwString("There was no YIADDR in dhcpAnswer"),
        src: ctx.state.netInterfaces[fromIntf].mac,
        payload,
      }),
    );
  }
}
