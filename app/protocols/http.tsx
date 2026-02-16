import { findInBuffer } from "../common";

export const HTTP_METHODS = [
  "GET",
  // Non vedo perché utilizzare questi altri metodi
  "HEAD",
  "OPTIONS",
  "TRACE",
  "PUT",
  "DELETE",
  "POST",
  "PATCH",
  "CONNECT",
] as const;
export type HTTP_METHOD = (typeof HTTP_METHODS)[number];
function isHTTPMethod(s: string): s is HTTP_METHOD {
  return HTTP_METHODS.includes(s as HTTP_METHOD);
}

export type RequestHeaders = Partial<{
  accept: string;
  "upgrade-insecure-requests": string;
  "user-agent": string;
  host: string;
}>;

export type ResponseHeaders = Partial<{
  "content-type": string;
  "content-length": string;
}>;

type Headers = RequestHeaders & ResponseHeaders;

export enum ResponseCode {
  OK = 200,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  IM_A_TEAPOT = 418,
  INTERNAL_ERROR = 500,
}

abstract class HttpMessage {
  headers: Headers;
  body: Buffer;

  constructor(body: Buffer, headers: Headers) {
    this.body = body;
    this.headers = headers;
  }

  abstract writeFirstLine(): string;
  abstract readFirstLine(line: string): void;

  toBytes() {
    return Buffer.concat([
      Buffer.from(
        [
          this.writeFirstLine(),
          ...Object.entries(this.headers).map(([k, v]) => `${k}: ${v}`),
          "",
          "",
        ].join("\r\n"),
      ),
      this.body,
    ]);
  }

  static fromBytes(bytes: Buffer): HttpMessage {
    // If starts with HTTP, the message is assumed to be a response
    const maybeVersion = bytes.subarray(4).toString();

    const headerEnd = findInBuffer(bytes, Buffer.from("\r\n\r\n"));

    const [firstLine, ...params] = bytes
      .subarray(0, headerEnd)
      .toString()
      .split("\r\n");
    const headers = Object.fromEntries(params.map((it) => it.split(": ")));

    const message =
      maybeVersion == "HTTP"
        ? new HttpRequest("", headers)
        : new HttpResponse(Buffer.alloc(0), ResponseCode.OK, headers);

    message.readFirstLine(firstLine);

    return message;
  }
}

export class HttpRequest extends HttpMessage {
  resource: string;
  method: HTTP_METHOD;

  constructor(
    resource: string,
    headers: RequestHeaders = {},
    method: HTTP_METHOD = "GET",
    body = Buffer.alloc(0),
  ) {
    super(body, headers);
    this.method = method;
    this.resource = resource;
  }

  writeFirstLine(): string {
    return `${this.method} ${encodeURI(this.resource)} HTTP/1.1`;
  }

  readFirstLine(line: string): void {
    if (line.split(" ").length < 3)
      throw `First line '${line}' is not of an HTTP request`;

    const [method, uri, http_version] = line.split(" ");

    if (!isHTTPMethod(method)) throw `Invalid HTTP method ${method}`;
    if (http_version !== "HTTP/1.1")
      console.log(
        `NOTE: I wasn't really supposed to handle not HTTP/1.1 requests '${line}'`,
      );

    this.method = method;
    this.resource = decodeURI(uri);
  }
}

export class HttpResponse extends HttpMessage {
  code: number;

  constructor(
    body: Buffer,
    responseCode: ResponseCode = ResponseCode.OK,
    headers: ResponseHeaders = {},
  ) {
    super(body, headers);
    this.code = responseCode;
  }

  writeFirstLine(): string {
    return `HTTP/1.1 ${this.code}`;
  }

  readFirstLine(line: string): void {
    if (line.split(" ").length < 2)
      throw `First line '${line}' is not of an HTTP response`;

    const [http_version, code] = line.split(" ");
    if (http_version !== "HTTP/1.1")
      console.log(
        `NOTE: I wasn't really supposed to handle not HTTP/1.1 requests '${line}'`,
      );

    // TODO: insert comment about the bad philosophy of Javascript and why I
    // shouldn't need to worry about whatever possible input I should get,
    // therefore ignoring that this might as well be NaN
    this.code = +code;
  }
}
