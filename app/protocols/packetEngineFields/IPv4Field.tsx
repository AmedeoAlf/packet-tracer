import { ipv4ToString } from "../rfc_760";
import { U32Field } from "./numberFields";

export class IPv4Field extends U32Field {
  stringify(value: number): string {
    return ipv4ToString(value);
  }
}
