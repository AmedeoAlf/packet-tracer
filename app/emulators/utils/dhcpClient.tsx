import {
  IPV4_BROADCAST,
  IPv4Address,
  IPv4Packet,
  L3InternalState,
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
  EthernetFrameSerializer,
  EtherType,
  MAC_BROADCAST,
} from "@/app/protocols/802_3";
import { runCatching, throwString } from "@/app/common";

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

export function handleDHCPPacket<State extends L3InternalState<State>>(
  ctx: EmulatorContext<State>,
  intfId: number,
  dhcpData: Buffer,
  setDns: (dns: IPv4Address) => void,
) {
  const pkt = DHCPSerializer.fromBytes(dhcpData);
  if (pkt.op == DHCPOp.request) return;
  const field = (code: keyof typeof TLVCode) =>
    tlvField(pkt, TLVCode[code]) ?? throwString(`No ${code} in dhcp packet`);

  const messageType: MessageType = field("messageType").readUInt8();
  switch (messageType) {
    case MessageType.offer:
      acceptDHCPOffer(ctx, intfId, pkt);
      return;
    case MessageType.acknowledgement:
      const mask = field("subnet").readUInt32BE();
      const gateway = field("router").readUInt32BE();
      const dns = runCatching(() => field("domainServer").readUInt32BE());
      ctx.state.l3Ifs[intfId] = {
        ip: pkt.yIAddr!,
        mask,
      };
      ctx.state.gateway = gateway;
      if (typeof dns != "undefined") setDns(dns);
      ctx.updateState();
  }
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
