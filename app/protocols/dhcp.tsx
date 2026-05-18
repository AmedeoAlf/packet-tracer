/*
 * Nota sull'accuratezza:
 *
 * Presenza dei campi dell'header
 *
 * DHCPDISCOVER
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | OP         sì | HTYPE   (0x1) | HLEN    (0x6) | HOPS    (0x0) |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                              XID                          sì  |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | SECS                    (0x0) | FLAGS                   (0x0) |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                             CIADDR                        sì  |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                             YIADDR                        sì  |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                             SIADDR                        sì  |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                             GIADDR                        sì  |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                                                               |
 * |                             CHADDR                            |
 * |                                                           sì  |
 * |                                                               |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Additional                                                    |
 * | x192                                                          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Magic cookie                                              sì  |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *
 * https://en.wikipedia.org/wiki/Dynamic_Host_Configuration_Protocol#Discovery
 */

import { bufferOfU32BE, bufferOfU8, randomU32, throwString } from "../common";
import { MacAddress } from "./802_3";
import { PacketSerializer } from "./packetEngine";
import { FixedBufferField } from "./packetEngineFields/bufferFields";
import { DHCPTLVOption, DHCPTLVField } from "./packetEngineFields/extraFields";
import { IPv4Field } from "./packetEngineFields/IPv4Field";
import { U8Field, U32Field, U16Field } from "./packetEngineFields/numberFields";
import { IPv4Address } from "./rfc_760";

export enum HType {
  ethernet = 1,
}

export enum DHCPOp {
  request = 1,
  response = 2,
}

export enum MessageType {
  discover = 1,
  offer = 2,
  request = 3,
  acknowledgement = 4,
}

export enum TLVCode {
  subnet = 0x01,
  router = 0x03,
  domainServer = 0x06,
  requestIp = 0x32,
  leaseTime = 0x33,
  dhcpServer = 0x36,
  parameterReqList = 0x37,
  messageType = 0x53,
}

const TLVEntry = {
  subnet: (subnet: IPv4Address) => [TLVCode.subnet, bufferOfU32BE(subnet)],
  router: (router: IPv4Address) => [TLVCode.router, bufferOfU32BE(router)],
  domainServer: (...servers: IPv4Address[]) => [
    TLVCode.domainServer,
    bufferOfU32BE(...servers),
  ],
  requestIp: (ip: IPv4Address) => [TLVCode.requestIp, bufferOfU32BE(ip)],
  leaseTime: (time: number) => [TLVCode.leaseTime, bufferOfU32BE(time)],
  dhcpServer: (server: IPv4Address) => [
    TLVCode.dhcpServer,
    bufferOfU32BE(server),
  ],
  // TODO: use TLVCodes
  parameterReqList: (...list: number[]) => [
    TLVCode.parameterReqList,
    bufferOfU8(...list),
  ],
  messageType: (type: MessageType) => [TLVCode.messageType, bufferOfU8(type)],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<keyof typeof TLVCode, (a: any) => DHCPTLVOption>;

export const DHCPSerializer = new PacketSerializer<DHCPPacket>([
  new U8Field("op"),
  new U8Field("hType", HType.ethernet),
  new U8Field("hLen", 6), // MAC length
  new U8Field("hOps", 0),
  new U32Field("xId", 0),
  new U16Field("secs", 0),
  new U16Field("flags", 0),
  new IPv4Field("cIAddr", 0),
  new IPv4Field("yIAddr", 0),
  new IPv4Field("sIAddr", 0),
  new IPv4Field("gIAddr", 0),
  new FixedBufferField("cHAddr", 16),
  new FixedBufferField("bootp", 192),
  new U32Field("magic", 0x63825363),
  new DHCPTLVField("options"),
]);

export type DHCPPacket = {
  op: DHCPOp;
  hType?: HType;
  hLen?: number;
  hOps?: number;
  xId?: number;
  secs?: number;
  flags?: number;
  cIAddr?: number;
  yIAddr?: number;
  sIAddr?: number;
  gIAddr?: number;
  cHAddr?: Buffer;
  bootp?: Buffer;
  options?: DHCPTLVOption[];
};

export function makeDHCPDiscover(
  mac: MacAddress,
  requestedIp?: IPv4Address,
): DHCPPacket {
  const cHAddr = Buffer.alloc(16);
  cHAddr.writeUInt32BE(mac / 2 ** 16);
  cHAddr.writeUInt16BE(mac & 0xffff, 4);
  return {
    op: DHCPOp.request,
    hType: HType.ethernet,
    xId: randomU32(),
    cHAddr,
    options: [
      TLVEntry.messageType(MessageType.discover),
      ...(typeof requestedIp != "undefined"
        ? [TLVEntry.requestIp(requestedIp)]
        : []),
      // from wikipedia, should be subnet mask, router, domain name and idk
      TLVEntry.parameterReqList(0x01, 0x03, 0x0f, 0x06),
    ],
  };
}

type DHCPOfferData = {
  from: DHCPPacket;
  serverAddr: IPv4Address;
  offered: IPv4Address;
  subnet: IPv4Address;
  dnsServers: IPv4Address[];
  leaseTime?: number; // default 86400
  router?: IPv4Address; // default serverAddr
};

// returns offer withouth checks
function _dhcpOffer(
  messageType: MessageType,
  {
    from,
    offered,
    serverAddr,
    dnsServers,
    subnet,
    router,
    leaseTime,
  }: DHCPOfferData,
): DHCPPacket {
  if (from.op != DHCPOp.request) throw "DHCP packet is not from client";
  return {
    ...from,
    op: DHCPOp.response,
    yIAddr: offered,
    sIAddr: serverAddr,
    options: [
      TLVEntry.messageType(messageType),
      TLVEntry.subnet(subnet),
      TLVEntry.router(router ?? serverAddr),
      TLVEntry.leaseTime(leaseTime ?? 86400),
      TLVEntry.domainServer(...dnsServers),
    ],
  };
}

export function makeDHCPOffer(data: DHCPOfferData): DHCPPacket {
  if (tlvField(data.from, TLVCode.messageType)?.at(0) !== MessageType.discover)
    throwString("Not a request");

  return _dhcpOffer(MessageType.offer, data);
}

export function makeDHCPRequest(dhcpOffer: DHCPPacket): DHCPPacket {
  if (tlvField(dhcpOffer, TLVCode.messageType)?.at(0) !== MessageType.offer)
    throwString("Not an offer");

  return {
    ...dhcpOffer,
    op: DHCPOp.request,
    yIAddr: 0,
    options: [
      TLVEntry.messageType(MessageType.request),
      TLVEntry.requestIp(dhcpOffer.yIAddr!),
      TLVEntry.dhcpServer(dhcpOffer.sIAddr!),
    ],
  };
}

export function makeDHCPAck(data: DHCPOfferData): DHCPPacket {
  if (tlvField(data.from, TLVCode.messageType)?.at(0) !== MessageType.request)
    throwString("Not a request");

  if (tlvField(data.from, 0x32)?.compare(bufferOfU32BE(data.offered)) !== 0)
    throwString("Offered IP does not match request");

  return _dhcpOffer(MessageType.acknowledgement, data);
}

export function tlvField(
  packet: DHCPPacket,
  field: TLVCode,
): Buffer | undefined {
  return packet.options?.find((opt) => opt[0] == field)?.at(1) as
    | Buffer
    | undefined;
}
