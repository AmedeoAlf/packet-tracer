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

import { bufferOfU32BE, bufferOfU8, randomU32 } from "../common";
import { MacAddress } from "./802_3";
import {
  DHCPTLVField,
  DHCPTLVOption,
  FixedBufferField,
  PacketSerializer,
  U16Field,
  U32Field,
  U8Field,
} from "./packetEngine";
import { IPv4Address } from "./rfc_760";

export enum HType {
  ethernet = 1,
}

export enum DHCPOp {
  request = 1,
  response = 2,
}

const OP_subnet = (subnet: IPv4Address) =>
  [0x01, bufferOfU32BE(subnet)] as const;
const OP_router = (router: IPv4Address) =>
  [0x03, bufferOfU32BE(router)] as const;
const OP_domainServer = (...servers: IPv4Address[]) =>
  [0x06, bufferOfU32BE(...servers)] as const;
const OP_requestIp = (ip: IPv4Address) => [0x32, bufferOfU8(ip)] as const;
const OP_leaseTime = (time: number) => [0x33, bufferOfU32BE(time)] as const;
const OP_parameterReqList = (...list: number[]) =>
  [0x37, bufferOfU8(...list)] as const;
const OP_messageType = (type: number) => [0x53, bufferOfU8(type)] as const;

export const DHCPSerializer = new PacketSerializer<DHCPPacket>([
  new U8Field("op"),
  new U8Field("hType", HType.ethernet),
  new U8Field("hLen", 6), // MAC length
  new U8Field("hOps", 0),
  new U32Field("xId", 0),
  new U16Field("secs", 0),
  new U16Field("flags", 0),
  new U32Field("cIAddr", 0),
  new U32Field("yIAddr", 0),
  new U32Field("sIAddr", 0),
  new U32Field("gIAddr", 0),
  new FixedBufferField("cHAddr", 16),
  new FixedBufferField("bootp", 192),
  new U32Field("magic", 0x63825363),
  new DHCPTLVField("options"),
]);

type DHCPPacket = {
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

export function DHCPDISCOVER(
  mac: MacAddress,
  requestedIp: IPv4Address,
): DHCPPacket {
  const cHAddr = Buffer.alloc(16);
  cHAddr.writeBigUInt64BE(BigInt(mac) << BigInt(16));
  return {
    op: DHCPOp.request,
    hType: HType.ethernet,
    xId: randomU32(),
    cHAddr,
    options: [
      OP_messageType(1),
      OP_requestIp(requestedIp),
      // from wikipedia, should be subnet mask, router, domain name and idk
      OP_parameterReqList(0x01, 0x03, 0x0f, 0x06),
    ],
  };
}

export function makeDHCPOffer(
  dhcpDiscover: DHCPPacket,
  serverAddr: IPv4Address,
  offered: IPv4Address,
  subnet: IPv4Address,
  dnsServers: IPv4Address[],
  leaseTime: number = 86400,
  router: IPv4Address = serverAddr,
): DHCPPacket {
  if (dhcpDiscover.op != DHCPOp.request) throw "Not a request";

  return {
    ...dhcpDiscover,
    op: DHCPOp.response,
    yIAddr: offered,
    sIAddr: serverAddr,
    options: [
      OP_messageType(2),
      OP_subnet(subnet),
      OP_router(router),
      OP_leaseTime(leaseTime),
      OP_domainServer(...dnsServers),
    ],
  };
}
