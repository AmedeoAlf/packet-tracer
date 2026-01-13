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
  OPT = 41,
}

export enum DNSClass {
  INTERNET = 1,
  CHAOS = 3,
  HESIOD = 4,
  NONE = 254,
  ANY = 255,
}

export class ResourceRecord {
  constructor(
    public name: string,
    public type: RRType,
    public classCode: DNSClass,
    public ttl: number,
    public rdata: Buffer,
  ) {}

  toBytes(): Buffer {
    if (this.rdata.length >= 1 << 16)
      throw `Can't handle resource record RDATA >=${1 << 16}`;
    const name = Buffer.from(
      this.name
        .split(".")
        .map((word) => Buffer.from(word, "ascii"))
        .flatMap((bytes) => {
          if (bytes.length >= 64)
            throw `Tried to encode domain longer than 64 bytes (${bytes.length}) in resource record`;
          return [bytes.length, ...bytes];
        })
        .concat([0]),
    );

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

  static fromBytes(bytes: Buffer, from: number): ResourceRecord {}
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
  ) {}
}

export class DNSPacket {
  constructor(public id: number) {}

  toBytes(): Buffer {
    return Buffer.alloc(0);
  }

  static fromBytes(bytes: Buffer): DNSPacket {}
}

export class DNSQueryPacket extends DNSPacket {
  constructor(
    id: number,
    public recursionDesired: boolean,
    public checkingDisabled = true,
  ) {
    super(id);
  }
}

export class DNSResponsePacket extends DNSPacket {
  constructor(
    id: number,
    public authoritative: boolean,
    public responseCode = ResponseCode.NoError,
    public recursionAvailable = false,
    public authenticData = true,
  ) {
    super(id);
  }
}
