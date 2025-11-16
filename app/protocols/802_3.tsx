export type MacAddress = number

export const MAC_BROADCAST: MacAddress = 0xFFFFFFFFFFFF;

export function randomMAC(): number {
  return 2 ** 48 * Math.random();
}

export class Layer2Packet {
  to: MacAddress;
  from: MacAddress;
  vlanTag?: number; // https://en.wikipedia.org/wiki/IEEE_802.1Q#Frame_format
  payload: ArrayBufferLike;
  constructor(payload: ArrayBufferLike, from: MacAddress, to?: MacAddress, vlanTag?: number) {
    this.payload = payload;
    this.from = from;
    this.to = to || MAC_BROADCAST;
    this.vlanTag = vlanTag;
  }
  toBytes(): Uint8Array {
    const packetBuf = new Uint8Array(1522);
    const view = new DataView(packetBuf.buffer);
    let cursor = 0;
    const writeMac = (mac: number) => {
      view.setUint16(cursor, mac / (2 ** 32));
      view.setUint32(cursor + 2, mac);
      cursor += 6;
    }

    writeMac(this.to);
    writeMac(this.from);
    if (this.vlanTag) {
      view.setUint32(cursor, 0x81000000 | (0xFFF & this.vlanTag))
      cursor += 4;
    }
    view.setUint16(cursor, this.payload.byteLength)
    cursor += 2;
    packetBuf.set(new Uint8Array(this.payload), cursor);
    return packetBuf
  }
  static fromBytes(bytes: ArrayBufferLike): Layer2Packet {
    const view = new DataView(bytes);
    let cursor = 0;
    const readMac = () => {
      cursor += 6;
      return view.getUint16(cursor - 6) * (2 ** 32) + view.getUint32(cursor - 4);
    }

    const to = readMac();
    const from = readMac();
    let vlanTag = undefined;
    if (view.getUint16(cursor) == 0x8100) {
      vlanTag = view.getUint16(cursor + 2) & 0xFFF;
      cursor += 4;
    }
    const len = view.getUint16(cursor);
    cursor += 2;
    const payload = bytes.slice(cursor, cursor + len);
    return new Layer2Packet(payload, from, to, vlanTag);
  }
}
