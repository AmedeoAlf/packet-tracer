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
  L3InternalState,
  ProtocolCode,
} from "@/app/protocols/rfc_760";
import { EmulatorContext } from "../DeviceEmulator";
import { sendIPv4Packet } from "./sendIPv4Packet";
import { EthernetFrame, MacAddress } from "@/app/protocols/802_3";
import { UDPSerializer } from "@/app/protocols/udp";

// NOTE: dhcp xId is not checked...
// NOTE: we do not respect leases, like at all

export type DHCPSettings = {
  network: IPv4Address;
  mask: IPv4Address;
  excluded: [IPv4Address, IPv4Address][];
  gateway: IPv4Address;
  dns: IPv4Address;

  assigned_t: Set<IPv4Address>;
  pending_t: Set<IPv4Address>;
};

// assumes ip to come from right network
export const isIpFree = (settings: DHCPSettings, ip: IPv4Address): boolean =>
  !settings.assigned_t.has(ip) &&
  !settings.pending_t.has(ip) &&
  !settings.excluded.some(([min, max]) => min <= ip && ip <= max);

function dhcpAllocRequested<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  settings: DHCPSettings,
  forMac: MacAddress,
  ip: IPv4Address,
): boolean {
  if ((ip & settings.mask) != settings.network || !isIpFree(settings, ip))
    return false;
  settings.pending_t.add(ip);
  ctx.state.macTable_t.set(ip, forMac);
  return true;
}

function dhcpAlloc<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  settings: DHCPSettings,
  forMac: MacAddress,
): IPv4Address | undefined {
  const maxIp = settings.network + ~settings.mask;
  for (let ip = settings.network; ip <= maxIp; ip++) {
    if (dhcpAllocRequested(ctx, settings, forMac, ip)) return ip;
  }
}

function dhcpFinalize(settings: DHCPSettings, ip: IPv4Address) {
  if (!settings.pending_t.delete(ip)) throw "Finalizing a non pending ip";
  settings.assigned_t.add(ip);
}

function dhcpCancel<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  settings: DHCPSettings,
  ip: IPv4Address,
) {
  if (settings.pending_t.delete(ip)) {
    ctx.state.macTable_t.delete(ip);
  }
}

export function dhcpFree<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  settings: DHCPSettings,
  ip: IPv4Address,
) {
  if (settings.assigned_t.delete(ip)) {
    ctx.state.macTable_t.delete(ip);
  }
}

export function handleDHCPPacket<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  settings: DHCPSettings,
  myIp: IPv4Address,
  ethFrame: EthernetFrame,
  dhcpData: Buffer,
) {
  const dhcpPkt = DHCPSerializer.fromBytes(dhcpData);
  const messageType: MessageType = (
    tlvField(dhcpPkt, TLVCode.messageType) ??
    throwString("No messageType header")
  ).readUInt8();

  const sendDHCP = (ipOffer: IPv4Address, packet: DHCPPacket) =>
    sendIPv4Packet(
      ctx,
      ipOffer,
      ProtocolCode.udp,
      UDPSerializer.toBuffer({
        payload: DHCPSerializer.toBuffer(packet),
        destination: 68,
        source: 67,
      }),
    );

  switch (messageType) {
    case MessageType.discover:
      const requestIp = tlvField(dhcpPkt, TLVCode.requestIp)?.readUint32BE();
      const offered =
        typeof requestIp == "undefined"
          ? dhcpAlloc(ctx, settings, ethFrame.src)
          : dhcpAllocRequested(ctx, settings, ethFrame.src, requestIp)
            ? requestIp
            : undefined;
      if (typeof offered != "number") throw "No IP could have been allocated";

      sendDHCP(
        offered,
        makeDHCPOffer({
          router: settings.gateway,
          dnsServers: [settings.dns],
          subnet: settings.mask,
          from: dhcpPkt,
          offered,
          serverAddr: myIp,
        }),
      );

      ctx.schedule(1000, (ctx) => {
        dhcpCancel(ctx, settings, offered);
      });

      break;
    case MessageType.request:
      if (dhcpPkt.sIAddr != myIp) return;
      const serverAddress = tlvField(
        dhcpPkt,
        TLVCode.dhcpServer,
      )?.readUInt32BE();
      if (typeof serverAddress == "number" && serverAddress != myIp) return;
      const requestedIp = tlvField(dhcpPkt, TLVCode.dhcpServer)?.readUInt32BE();
      if (typeof requestedIp == "undefined") return;
      if (!settings.pending_t.has(requestedIp)) return;

      dhcpFinalize(settings, requestedIp);
      sendDHCP(
        requestedIp,
        makeDHCPAck({
          router: settings.gateway,
          dnsServers: [settings.dns],
          subnet: settings.mask,
          from: dhcpPkt,
          offered: requestedIp,
          serverAddr: myIp,
        }),
      );
      break;
  }
}
