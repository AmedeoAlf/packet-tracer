/*
 * Nota sull'accuratezza:
 *
 * Presenza dei campi dell'header
 *                                 1  1  1  1  1  1
 *   0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
 *  +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  |                      ID                       |
 *  +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  |QR|   OpCode  |AA|TC|RD|RA| Z|AD|CD|   RCODE   |
 *  +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  |                QDCOUNT/ZOCOUNT                |
 *  +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  |                ANCOUNT/PRCOUNT                |
 *  +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  |                NSCOUNT/UPCOUNT                |
 *  +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  |                    ARCOUNT                    |
 *  +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *
 */

export enum RRType {
  A = 1,
  AAAA = 28,
  AFSDB = 18,
  APL = 42,
  CAA = 257,
  CDNSKEY = 60,
  CDS = 59,
  CERT = 37,
  CNAME = 5,
  CSYNC = 62,
  DHCID = 49,
  DLV = 32769,
  DNAME = 39,
  DNSKEY = 48,
  DS = 43,
  EUI48 = 108,
  EUI64 = 109,
  HINFO = 13,
  HIP = 55,
  HTTPS = 65,
  IPSECKEY = 45,
  KEY = 25,
  KX = 36,
  LOC = 29,
  MX = 15,
  NAPTR = 35,
  NS = 2,
  NSEC = 47,
  NSEC3 = 50,
  NSEC3PARAM = 51,
  OPENPGPKEY = 61,
  PTR = 12,
  RP = 17,
  RRSIG = 46,
  SIG = 24,
  SMIMEA = 53,
  SOA = 6,
  SRV = 33,
  SSHFP = 44,
  SVCB = 64,
  TA = 32768,
  TKEY = 249,
  TLSA = 52,
  TSIG = 250,
  TXT = 16,
  URI = 256,
  ZONEMD = 63,

  STAR = 255,
  AXFT = 252,
  IXFR = 251,
  OPT = 41
}

export enum DNSClass {
  INTERNET = 1,
  CHAOS = 3,
  HESIOD = 4,
  NONE = 254,
  ANY = 255
}

function parseNameField(nullTerminated: Buffer): string[] {
  let cursor = 0;
  const words = [];
  while (cursor < nullTerminated.length && nullTerminated[cursor] != 0) {
    words.push(
      nullTerminated
        .subarray(cursor + 1, cursor + nullTerminated[cursor])
        .toString("ascii")
    )
    cursor += nullTerminated[cursor] + 1;
  }
  return words;
}

function serializeNameField(words: string[]): Buffer {
  return Buffer.from(
    words
      .map(word => Buffer.from(word, "ascii"))
      .flatMap(bytes => {
        if (bytes.length >= 64) throw `Tried to encode domain longer than 64 bytes (${bytes.length}) in resource record`;
        return [bytes.length, ...bytes]
      })
      .concat([0])
  );
}

export class ResourceRecord {
  constructor(
    public name: string,
    public type: RRType,
    public classCode: DNSClass,
    public ttl: number,
    public rdata: Buffer
  ) { }

  toBytes(): Buffer {
    if (this.rdata.length >= 1 << 16) throw `Can't handle resource record RDATA >=${1 << 16}`;
    const name = serializeNameField(this.name.split("."));

    const buf = Buffer.alloc(name.length + 10 + this.rdata.length);
    buf.set(name);
    let cursor = name.length;

    buf.writeUInt16BE(this.type, cursor);
    buf.writeUInt16BE(this.classCode, (cursor += 2));
    buf.writeUInt32BE(this.ttl, (cursor += 2));
    buf.writeUInt16BE(this.rdata.length, (cursor += 4));
    buf.set(this.rdata, (cursor += 2));

    return buf;
  }

  static fromBytes(bytes: Buffer): ResourceRecord {
    const nameLen = bytes.indexOf(0) + 1;
    const name = parseNameField(bytes.subarray(0, nameLen)).join(".");

    const type = bytes.readUInt16BE(nameLen);
    if (!(type in RRType)) throw `Invalid RRType ${type}, can't decode ResourceRecord`;

    const dnsClass = bytes.readUInt16BE(nameLen + 2);
    if (!(dnsClass in DNSClass)) throw `Invalid DNSClass ${dnsClass}, can't decode ResourceRecord`;

    const ttl = bytes.readUInt32BE(nameLen + 4);

    const rdataLen = bytes.readUInt16BE(nameLen + 8);

    return new ResourceRecord(
      name,
      type,
      dnsClass,
      ttl,
      bytes.subarray(nameLen + 10, nameLen + 10 + rdataLen)
    )
  }
}

export enum ResponseCode {
  NoError = 0,
  FormErr,
  ServFail,
  NXDomain,
  NotImp,
  Refused,
  YXDomain,
  YXRRSet,
  NXRRSet,
  NotAuth,
  NotZone,
  BADVERS_BADSIG = 16,
  BADKEY,
  BADTIME,
  BADMODE,
  BADNAME,
  BADALG,
  BADTRUNC,
}

export enum DNSOpCodes {
  Query = 0,
  IQuery,
  Status,
  Notify = 4,
  Update,
}

export class DNSQuestion {
  constructor(
    public name: string,
    public type: RRType,
    public dnsClass: DNSClass,
  ) { }

  toBytes() {
    const name = serializeNameField(this.name.split("."));
    const bytes = Buffer.alloc(name.length + 4);
    bytes.writeUInt16BE(this.type, name.length);
    bytes.writeUInt16BE(this.dnsClass, name.length + 2);
    return bytes;
  }

  static fromBytes(bytes: Buffer): DNSQuestion {
    const nameLen = bytes.indexOf(0) + 1;
    const name = parseNameField(bytes.subarray(0, nameLen)).join(".");

    const type = bytes.readUInt16BE(nameLen);
    if (!(type in RRType)) throw `Invalid RRType ${type}, can't decode DNSQuestion`;

    const dnsClass = bytes.readUInt16BE(nameLen + 2);
    if (!(dnsClass in DNSClass)) throw `Invalid DNSClass ${dnsClass}, can't decode DNSQuestion`;

    return new DNSQuestion(name, type, dnsClass);
  }
}

export enum OPCode {
  QUERY, IQUERY, STATUS 
}

export class DNSPacket {
  constructor(
    public id: number,
    public opcode: OPCode,
    public questions: DNSQuestion[],
    public answers: ResourceRecord[],
    public authorityRR: ResourceRecord[],
    public additionalRR: ResourceRecord[],
  ) { }

  // Non imposta le flag!!! È responsabilità dell classi figlie
  protected _toBytes(): Buffer {
    const payloads = [
      ...this.questions.map(it => it.toBytes()),
      ...this.answers.map(it => it.toBytes()),
      ...this.authorityRR.map(it => it.toBytes()),
      ...this.additionalRR.map(it => it.toBytes()),
    ]

    const totalLen = 12 /* Header len */ + payloads
      .map(it => it.length)
      .reduce((acc, val) => acc + val);

    const buf = Buffer.alloc(totalLen);
    buf.writeUInt16BE(this.id);
    buf.writeUInt16BE(this.questions.length, 4);
    buf.writeUInt16BE(this.answers.length, 6);
    buf.writeUInt16BE(this.authorityRR.length, 8);
    buf.writeUInt16BE(this.additionalRR.length, 10);

    let cursor = 12;
    for (const p of payloads) {
      buf.set(p, cursor);
      cursor += p.length;
    }

    return buf;
  }
}

export class DNSQueryPacket extends DNSPacket {
  constructor(
    id: number,
    public recursionDesired: boolean,
    public checkingDisabled = true,
    opcode: OPCode = OPCode.QUERY,
    questions: DNSQuestion[] = [],
    answers: ResourceRecord[] = [],
    authorityRR: ResourceRecord[] = [],
    additionalRR: ResourceRecord[] = [],
  ) {
    super(id, opcode, questions, answers, authorityRR, additionalRR);
  }

  toBytes(): Buffer {
    const buf = this._toBytes();
    const flags =
      Number(this.recursionDesired) << 8
      | Number(this.checkingDisabled) << 4
      | (this.opcode & 0b1111) << 11;
    buf.writeUint16BE(flags, 2);
    return buf;
  }
}

export class DNSResponsePacket extends DNSPacket {
  constructor(
    id: number,
    public authoritative: boolean,
    public responseCode = ResponseCode.NoError,
    public recursionAvailable = false,
    public authenticData = true,
    opcode: OPCode = OPCode.QUERY,
    questions: DNSQuestion[] = [],
    answers: ResourceRecord[] = [],
    authorityRR: ResourceRecord[] = [],
    additionalRR: ResourceRecord[] = [],
  ) {
    super(id, opcode, questions, answers, authorityRR, additionalRR);
  }
  toBytes(): Buffer {
    const buf = this._toBytes();
    const flags =
      1 << 15
      | Number(this.authoritative) << 10
      | Number(this.recursionAvailable) << 7
      | Number(this.authenticData) << 5
      | this.responseCode & 0b1111
      | (this.opcode & 0b1111) << 11;
    buf.writeUint16BE(flags, 2);
    return buf;
  }
}
