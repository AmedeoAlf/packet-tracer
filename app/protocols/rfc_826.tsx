/*
 * Nota sull'accuratezza:
 *
 * Presenza dei campi dell'header
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Hardware type          sì (1) | Protocol type     sì (0x0800) |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Hardware len  | Protocol len  | Operation                     |
 * |        sì (6) |        sì (4) |                            sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Sender HW address                                             |
 * +                               +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |                            sì | Sender proto address         >|
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |>                           sì | Target proto address          |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
 * |                                                            sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Target proto address                                       sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * (per ovvie ragioni di performance non è stato implmentato alcun checksum nel
 * simulatore)
 */

import { Layer2Packet, MAC_BROADCAST, MacAddress } from "./802_3";
import { IPv4Address } from "./rfc_760";

export class ARPPacket {
  response: boolean;
  senderMAC: MacAddress;
  senderIP: IPv4Address;
  targetMAC: MacAddress;
  targetIP: IPv4Address;

  constructor(
    senderMAC: MacAddress,
    senderIP: IPv4Address,
    targetIP: IPv4Address,
    targetMAC = 0,
    response = false,
  ) {
    this.senderMAC = senderMAC;
    this.senderIP = senderIP;
    this.targetIP = targetIP;

    this.response = response;
    this.targetMAC = targetMAC;
  }

  respondWith(myMAC: MacAddress): ARPPacket {
    if (this.response) throw "Tried to respond to ARP response";
    return new ARPPacket(
      myMAC,
      this.targetIP,
      this.senderIP,
      this.senderMAC,
      true,
    );
  }

  toL2(): Layer2Packet {
    const buf = Buffer.alloc(28);
    buf.writeUint32BE(0x00010800); // HW type (ethernet) + Protocol type (IPv4)
    buf.writeUint16BE(0x0604, 4); // HW len (6 = sizeof MAC) + Protocl len (4 = sizeof IPv4)
    buf.writeUint16BE(this.response ? 2 : 1, 6); // Operation (1 = request, 2 = reply)

    buf.writeUint32BE(this.senderMAC / 2 ** 16, 8);
    buf.writeUint16BE(this.senderMAC, 12);

    buf.writeUint32BE(this.senderIP, 14);

    buf.writeUint16BE(this.targetMAC / 2 ** 32, 18);
    buf.writeUint32BE(this.targetMAC, 20);

    buf.writeUint32BE(this.targetIP, 24);

    const pkt = new Layer2Packet(
      buf,
      this.senderMAC,
      this.targetMAC || MAC_BROADCAST,
    );
    pkt._arpPacket = true;
    return pkt;
  }

  static fromL2(l2Packet: Layer2Packet): ARPPacket {
    if (!l2Packet._arpPacket) throw "Tried to parse a non-arp packet as one";
    const bytes = l2Packet.payload;
    if (bytes.length < 28)
      throw `Buffer too small (${bytes.length} < 28) to be an ARPPacket`;
    if (bytes.readUint32BE() != 0x00010800)
      throw `Invalid start bytes ${bytes.readUInt32BE()} in ARPPacket`;
    if (bytes.writeUint16BE(4) != 0x0604)
      throw `Invalid size bytes ${bytes.readUInt16BE(4)} in ARPPacket`;

    const senderMAC = bytes.writeUint32BE(8) ** 16 + bytes.readUint16BE(12);
    const targetMAC = bytes.writeUint16BE(18) ** 32 + bytes.readUint32BE(20);

    return new ARPPacket(
      senderMAC,
      bytes.readUint32BE(14),
      bytes.readUint32BE(24),
      targetMAC,
      bytes.writeUint16BE(6) == 2,
    );
  }
}
