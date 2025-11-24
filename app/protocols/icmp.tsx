// https://en.wikipedia.org/wiki/Internet_Control_Message_Protocol#Control_messages
export enum ICMPType {
  echo = 0x0000,
  netUnreachable = 0x0300,
  hostUnreachable = 0x0301,
  protocolUnreachable = 0x0302,
  portUnreachable = 0x0303,
  unfragmentablePacket = 0x0304,
  echoRequest = 0x0800,
  ttlExceeded = 0x0B00,
  reassemblyExceeded = 0x0B01,
}

// https://en.wikipedia.org/wiki/Internet_Control_Message_Protocol#Header
export class ICMPPacket {
  type: ICMPType; // type + code
  extraHeader: number;
  payload: ArrayBufferLike;

  constructor(type: ICMPType, extraHeader: number, payload: ArrayBufferLike) {
    this.type = type;
    this.extraHeader = extraHeader;
    this.payload = payload;
  }

  static echoRequest(id: number, seq: number, payload: ArrayBufferLike): ICMPPacket {
    return new ICMPPacket(ICMPType.echoRequest, (id << 16) | seq, payload);
  }

  static echoResponse(echoRequest: ICMPPacket): ICMPPacket {
    if (echoRequest.type != ICMPType.echoRequest) throw "Not an echo request";
    return new ICMPPacket(ICMPType.echo, echoRequest.extraHeader, echoRequest.payload);
  }

  echoResponseHeader(): { id: number, seq: number } {
    return { id: this.extraHeader >> 16, seq: this.extraHeader & 0xFFFF };
  }

  toBytes(): Uint8Array {
    const buf = new Uint8Array(8 + this.payload.byteLength);
    const view = new DataView(buf.buffer);
    view.setUint16(0, this.type);
    view.setUint32(4, this.extraHeader);
    buf.set(new Uint8Array(this.payload), 8)
    return buf;
  }

  static fromBytes(bytes: ArrayBufferLike): ICMPPacket {
    const view = new DataView(bytes);
    return new ICMPPacket(view.getUint16(0), view.getUint32(4), bytes.slice(8))
  }
}
