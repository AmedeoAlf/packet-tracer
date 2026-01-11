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

export class ResourceRecord {
  constructor(
    name: string,
    type: RRType,
    dnsClass: DNSClass,
    ttl: number,
    rdata: Buffer
  ) { }
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
    name: string,
    type: RRType,
    dnsClass: DNSClass,
  ) { }
}

export class DNSPacket {
  constructor(
    id: number,
  ) { }

  toBytes(): Buffer {
    return Buffer.alloc(0);
  }

  static fromBytes(bytes: Buffer): DNSPacket {
  }
}

export class DNSQueryPacket extends DNSPacket {
  constructor(
    id: number,
    recursionDesired: boolean,
    checkingDisabled = true
  ) {
    super(id);
  }
}

export class DNSResponsePacket extends DNSPacket {
  constructor(
    id: number,
    authoritative: boolean,
    responseCode = ResponseCode.NoError,
    recursionAvailable = false,
    authenticData = true,
  ) {
    super(id);
  }
}
