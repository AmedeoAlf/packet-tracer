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

import { randomU32 } from "../common";
import { MacAddress } from "./802_3";

export enum HType {
  ethernet = 1,
}

abstract class DHCPPacket {
  abstract op: number;

  constructor(
    public hType: HType = HType.ethernet, // Assuming ethernet
    public hLen: number = 6, // MAC address is 6 bytes
    public hOps: number = 0, // Wikipedia always reports 0x0
    public xId: number,
    public secs: number = 0, // Wikipedia always reports 0x0
    public flags: number = 0, // Should be 0x8000 for broadcast, we don't implement that
    public cIAddr: number,
    public yIAddr: number,
    public sIAddr: number,
    public gIAddr: number,
    public cHAddr: Buffer,
    public bootp: Buffer,
  ) {}

  static fromBytes(bytes: Buffer): DHCPPacket {
    let constructor: typeof DHCPRequest | typeof DHCPResponse;
    switch (bytes.readUInt8()) {
      case 1:
        constructor = DHCPRequest;
        break;
      case 2:
        constructor = DHCPResponse;
        break;
      default:
        throw "Invalid OP parameter in dhcppacket parsing";
    }

    return new constructor(
      bytes.readUInt8(1), // hType
      bytes.readUInt8(2), // hLen
      bytes.readUInt8(3), // hOps
      bytes.readUInt32BE(4), // xId
      bytes.readUInt16BE(8), // secs
      bytes.readUInt16BE(10), // flags
      bytes.readUInt32BE(12), // cIAddr
      bytes.readUInt32BE(16), // yIAddr
      bytes.readUInt32BE(20), // sIAddr
      bytes.readUInt32BE(24), // gIAddr
      bytes.subarray(28, 44), // cHAddr
      bytes.subarray(44, 236), // bootp
    );
  }

  toBytes(): Buffer {
    const buf = Buffer.alloc(236);
    buf.writeUInt32BE(this.op);

    buf.writeUInt8(this.hType, 1);
    buf.writeUInt8(this.hLen, 2);
    buf.writeUInt8(this.hOps, 3);
    buf.writeUInt32BE(this.xId, 4);
    buf.writeUInt16BE(this.secs, 8);
    buf.writeUInt16BE(this.flags, 10);
    buf.writeUInt32BE(this.cIAddr, 12);
    buf.writeUInt32BE(this.yIAddr, 16);
    buf.writeUInt32BE(this.sIAddr, 20);
    buf.writeUInt32BE(this.gIAddr, 24);
    buf.set(this.cHAddr, 28);
    buf.set(this.bootp, 44);
    buf.set(this.bootp, 44);

    buf.writeUInt32BE(0x63825363, 236); // magic cookie (not checked)

    return buf;
  }
}

class DHCPRequest extends DHCPPacket {
  op = 1;

  static DHCPDISCOVER(mac: MacAddress): DHCPRequest {
    const cHAddr = Buffer.alloc(16);
    cHAddr.writeBigUInt64BE(BigInt(mac) << BigInt(16));
    return new DHCPRequest(
      HType.ethernet,
      6,
      0,
      randomU32(),
      0,
      0,
      0,
      0,
      0,
      0,
      cHAddr,
      Buffer.alloc(0),
    );
  }
}

class DHCPResponse extends DHCPPacket {
  op = 2;
}
