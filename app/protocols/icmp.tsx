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

import {
  FillingBufferField,
  PacketSerializer,
  U16Field,
  U32Field,
} from "./packetEngine";

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
export type ICMPPacket = {
  type: ICMPType;
  checksum?: number;
  extraHeader: number;
  payload?: Buffer;
};

export const ICMPPacketSerializer = new PacketSerializer<ICMPPacket>([
  new U16Field("type"),
  new U16Field("checksum"),
  new U32Field("extraHeader"),
  new FillingBufferField("payload"),
]);

export function echoRequest(
  id: number,
  seq: number,
  payload: Buffer,
): ICMPPacket {
  return {
    type: ICMPType.echoRequest,
    extraHeader: (id << 16) | seq,
    payload,
  };
}

export function echoResponse(echoRequest: ICMPPacket): ICMPPacket {
  if (echoRequest.type != ICMPType.echoRequest) throw "Not an echo request";
  return {
    ...echoRequest,
    type: ICMPType.echo,
  };
}

export function echoResponseHeader(packet: ICMPPacket): {
  id: number;
  seq: number;
} {
  return { id: packet.extraHeader >> 16, seq: packet.extraHeader & 0xffff };
}
