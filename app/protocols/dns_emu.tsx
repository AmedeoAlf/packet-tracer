// Every packet is a valid DNS packet in the real world, BUT most fields are hardcoded
// and simplified

import { IPv4Address } from "./rfc_760";

export enum RRType {
  A = 1
}

export enum ResponseCode {
  NoError = 0,
  NXDomain = 2,
}

function parseNameField(nullTerminated: Buffer): string[] {
  let cursor = 0;
  const words = [];
  while (cursor < nullTerminated.length && nullTerminated[cursor] != 0) {
    words.push(
      nullTerminated
        .subarray(cursor + 1, cursor + nullTerminated[cursor])
        .toString("ascii"),
    );
    cursor += nullTerminated[cursor] + 1;
  }
  return words;
}

function serializeNameField(words: string[]): Buffer {
  return Buffer.from(
    words
      .map((word) => Buffer.from(word, "ascii"))
      .flatMap((bytes) => {
        if (bytes.length >= 64)
          throw `Tried to encode domain longer than 64 bytes (${bytes.length}) in resource record`;
        return [bytes.length, ...bytes];
      })
      .concat([0]),
  );
}

export class ResourceRecord {
  constructor(
    public name: string,
    public rdata: Buffer,
    public type = RRType.A
  ) { }

  toBytes(): Buffer {
    if (this.rdata.length >= 1 << 16)
      throw `Can't handle resource record RDATA >=${1 << 16}`;
    const name = serializeNameField(this.name.split("."));

    const buf = Buffer.alloc(name.length + 10 + this.rdata.length);
    buf.set(name);
    let cursor = name.length;

    buf.writeUInt16BE(this.type, cursor);
    buf.writeUInt16BE(1, (cursor += 2)); // Class = internet
    buf.writeUInt32BE(86400, (cursor += 2)); // TTL
    buf.writeUInt16BE(this.rdata.length, (cursor += 4));
    buf.set(this.rdata, (cursor += 2));

    return buf;
  }

  static fromBytes(bytes: Buffer): [r: ResourceRecord, offset: number] {
    const nameLen = bytes.indexOf(0) + 1;
    const name = parseNameField(bytes.subarray(0, nameLen)).join(".");

    const type = bytes.readUInt16BE(nameLen);
    const rdataLen = bytes.readUInt16BE(nameLen + 8);

    return [
      new ResourceRecord(
        name,
        bytes.subarray(nameLen + 10, nameLen + 10 + rdataLen),
        type
      ),
      nameLen + 10 + rdataLen,
    ];
  }
}

export class DNSQuestion {
  constructor(public name: string) { }

  toBytes() {
    const name = serializeNameField(this.name.split("."));
    const bytes = Buffer.alloc(name.length + 4);
    bytes.writeUInt16BE(1, name.length); // type = A
    bytes.writeUInt16BE(1, name.length + 2); // Class = internet
    return bytes;
  }

  static fromBytes(bytes: Buffer): [question: DNSQuestion, offset: number] {
    const nameLen = bytes.indexOf(0) + 1;
    const name = parseNameField(bytes.subarray(0, nameLen)).join(".");

    return [new DNSQuestion(name), nameLen];
  }

  answerTypeA(ip: IPv4Address): ResourceRecord {
    const data = Buffer.alloc(4);
    data.writeUInt32BE(ip);
    return new ResourceRecord(this.name, data);
  }
}

export class DNSPacket {
  constructor(
    public id: number,
    public questions: DNSQuestion[],
    public answers: ResourceRecord[],
  ) { }

  // Non imposta le flag!!! È responsabilità dell classi figlie
  protected _toBytes(): Buffer {
    const payloads = [
      ...this.questions.map((it) => it.toBytes()),
      ...this.answers.map((it) => it.toBytes()),
    ];

    const totalLen =
      12 /* Header len */ +
      payloads.map((it) => it.length).reduce((acc, val) => acc + val);

    const buf = Buffer.alloc(totalLen);
    buf.writeUInt16BE(this.id);
    buf.writeUInt16BE(this.questions.length, 4);
    buf.writeUInt16BE(this.answers.length, 6);
    buf.writeUInt16BE(0, 8); // # of authority RR
    buf.writeUInt16BE(0, 10); // # of additional RR

    let cursor = 12;
    for (const p of payloads) {
      buf.set(p, cursor);
      cursor += p.length;
    }

    return buf;
  }

  static fromBytes(bytes: Buffer) {
    const id = bytes.readUInt16BE(0);
    const flags = bytes.readUInt16BE(2);
    const questionsLen = bytes.readUInt16BE(4);
    const answerLen = bytes.readUInt16BE(6);

    const questions = [];

    let cursor = 12;
    for (let i = 0; i < questionsLen; i++) {
      const [q, len] = DNSQuestion.fromBytes(bytes.subarray(cursor));
      questions.push(q);
      cursor += len;
    }

    const answers = [];
    for (let i = 0; i < answerLen; i++) {
      const [a, len] = ResourceRecord.fromBytes(bytes.subarray(cursor));
      answers.push(a);
      cursor += len;
    }

    if (flags & 0x80) {
      return new DNSResponsePacket(id, flags & 0b1111, questions, answers);
    } else {
      return new DNSQueryPacket(id, questions);
    }
  }
}

export class DNSQueryPacket extends DNSPacket {
  constructor(id: number, questions: DNSQuestion[]) {
    super(id, questions, []);
  }

  toBytes(): Buffer {
    return this._toBytes();
  }
}

export class DNSResponsePacket extends DNSPacket {
  constructor(
    id: number,
    public responseCode = ResponseCode.NoError,
    questions: DNSQuestion[] = [],
    answers: ResourceRecord[] = [],
  ) {
    super(id, questions, answers);
  }
  toBytes(): Buffer {
    const buf = this._toBytes();
    const flags = (1 << 15) | (this.responseCode & 0b1111);
    buf.writeUint16BE(flags, 2);
    return buf;
  }
}
