import {
  IPV4_BROADCAST,
  IPv4Address,
  IPv4Packet,
  L3InternalState,
  PartialIPv4Packet,
  ProtocolCode,
} from "@/app/protocols/rfc_760";
import { EmulatorContext } from "../DeviceEmulator";
import {
  DHCPOp,
  DHCPPacket,
  DHCPSerializer,
  makeDHCPDiscover,
  makeDHCPRequest,
  MessageType,
  TLVCode,
  tlvField,
} from "@/app/protocols/dhcp";
import { UDPSerializer } from "@/app/protocols/udp";
import {
  EthernetFrame,
  EthernetFrameSerializer,
  EtherType,
  MAC_BROADCAST,
} from "@/app/protocols/802_3";
import { runCatching, throwString } from "@/app/common";
import { DhcpInternalState } from "@/app/devices/list/Computer";

export function sendDHCPDiscover<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  intfId: number,
  requestedIp?: IPv4Address,
) {
  dhcpQuestion(
    ctx,
    intfId,
    makeDHCPDiscover(ctx.state.netInterfaces[intfId].mac, requestedIp),
  );
}

export function acceptDHCPOffer<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  intfId: number,
  dhcpOffer: DHCPPacket,
) {
  dhcpQuestion(ctx, intfId, makeDHCPRequest(dhcpOffer));
}

export function handleDHCPPacket<State extends DhcpInternalState<State>>(
  ctx: EmulatorContext<State>,
  intfId: number,
  l2Pkt: EthernetFrame,
  setDns: (dns: IPv4Address) => void,
): void {
  let dhcpPkt: DHCPPacket;
  // some dhcp validation logic
  {
    if (l2Pkt.dst != ctx.state.netInterfaces[intfId].mac) return;
    if (!ctx.state.dhcpEnabled[intfId]) return;
    const ipPkt = new PartialIPv4Packet(l2Pkt.payload);
    if (ipPkt.protocol != ProtocolCode.udp)
      throw "Why did I get a non-udp dhcp packet?";
    if (!ipPkt.isPayloadFinished())
      throw "DHCP packets defragmentation is not implemented :-(";
    const udpPkt = UDPSerializer.fromBytes(ipPkt.payload);
    if (udpPkt.source != 67 || udpPkt.destination != 68) return;

    dhcpPkt = DHCPSerializer.fromBytes(udpPkt.payload);
  }

  if (dhcpPkt.op == DHCPOp.request) return;
  const field = (code: keyof typeof TLVCode) =>
    tlvField(dhcpPkt, TLVCode[code]) ??
    throwString(`No ${code} in dhcp packet`);

  const messageType: MessageType = field("messageType").readUInt8();
  switch (messageType) {
    case MessageType.offer:
      acceptDHCPOffer(ctx, intfId, dhcpPkt);
      return;
    case MessageType.acknowledgement:
      const mask = field("subnet").readUInt32BE();
      const gateway = field("router").readUInt32BE();
      const dns = runCatching(() => field("domainServer").readUInt32BE());
      ctx.state.l3Ifs[intfId] = {
        ip: dhcpPkt.yIAddr!,
        mask,
      };
      ctx.state.gateway = gateway;
      if (typeof dns != "undefined") setDns(dns);
      ctx.updateState();
  }
}

export function dhcpDaemonInit<State extends DhcpInternalState<State>>(
  ctx: EmulatorContext<State>,
) {
  // Unset ips for dhcp interfaces
  ctx.state.l3Ifs = ctx.state.l3Ifs.map((l3if, idx) =>
    ctx.state.dhcpEnabled[idx] ? null : l3if,
  );
  const loop = (ctx: EmulatorContext<State>) => {
    ctx.state.dhcpEnabled.forEach((on, intf) => {
      if (on && ctx.state.l3Ifs[intf] == null) sendDHCPDiscover(ctx, intf);
    });
    ctx.schedule(3000, loop);
  };
  loop(ctx);
}

function dhcpQuestion<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  onIntf: number,
  packet: DHCPPacket,
) {
  const ipPkt = new IPv4Packet(
    ProtocolCode.udp,
    UDPSerializer.toBuffer({
      payload: DHCPSerializer.toBuffer(packet),
      destination: 67,
      source: 68,
    }),
    0,
    IPV4_BROADCAST,
  );
  const payloads = ipPkt.toFragmentedBytes();
  for (const payload of payloads) {
    ctx.sendOnIf(
      onIntf,
      EthernetFrameSerializer.toBuffer({
        lenOrEtherType: EtherType.dhcp,
        dst: MAC_BROADCAST,
        src: ctx.state.netInterfaces[onIntf].mac,
        payload,
      }),
    );
  }
}
