/*
 * Nota sull'accuratezza:
 *
 * Presenza dei campi dell'header
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Type       sì | Code       sì | Checksum                vuoto |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | Rest of header                                             sì |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *
 * - Le combinazioni "Type" + "Code" sono definite nell'enum `ICMPType`
 *
 * (per ovvie ragioni di performance non è stato implmentato alcun checksum nel
 * simulatore)
 */

// https://en.wikipedia.org/wiki/Internet_Control_Message_Protocol#Control_messages
export enum ICMPType {
  echo = 0x0000,
  netUnreachable = 0x0300,
  hostUnreachable = 0x0301,
  protocolUnreachable = 0x0302,
  portUnreachable = 0x0303,
  unfragmentablePacket = 0x0304,
  echoRequest = 0x0800,
  ttlExceeded = 0x0b00,
  reassemblyExceeded = 0x0b01,
}

// https://en.wikipedia.org/wiki/Internet_Control_Message_Protocol#Header
export class ICMPPacket {
  type: ICMPType; // type + code
  extraHeader: number;
  payload: Buffer;

  constructor(type: ICMPType, extraHeader: number, payload: Buffer) {
    this.type = type;
    this.extraHeader = extraHeader;
    this.payload = payload;
  }

  static echoRequest(id: number, seq: number, payload: Buffer): ICMPPacket {
    return new ICMPPacket(ICMPType.echoRequest, (id << 16) | seq, payload);
  }

  static echoResponse(echoRequest: ICMPPacket): ICMPPacket {
    if (echoRequest.type != ICMPType.echoRequest) throw "Not an echo request";
    return new ICMPPacket(
      ICMPType.echo,
      echoRequest.extraHeader,
      echoRequest.payload,
    );
  }

  echoResponseHeader(): { id: number; seq: number } {
    return { id: this.extraHeader >> 16, seq: this.extraHeader & 0xffff };
  }

  toBytes(): Buffer {
    const buf = Buffer.alloc(8 + this.payload.byteLength);
    buf.writeUInt16BE(this.type, 0);
    buf.writeUInt32BE(4, this.extraHeader);
    buf.set(this.payload, 8);
    return buf;
  }

  static fromBytes(bytes: Buffer): ICMPPacket {
    return new ICMPPacket(
      bytes.readUint16BE(0),
      bytes.readUint32BE(4),
      bytes.subarray(8),
    );
  }
}
