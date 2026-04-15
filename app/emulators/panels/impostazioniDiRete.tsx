import { ComputerInternalState } from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import { getDns } from "../utils/dnsUtils";
import {
  IPV4_BROADCAST,
  ipv4ToString,
  parseIpv4,
} from "@/app/protocols/rfc_760";
import { KeysOfType, throwString } from "@/app/common";
import { removeFile, writeFileInLocation } from "../utils/osFiles";
import { Button } from "@/app/editorComponents/RoundBtn";

type ComputerStringProp = NonNullable<
  KeysOfType<ComputerInternalState, string | undefined>
>;
function NetworkField({
  ctx,
  label,
  prop,
  ifUnset,
}: {
  ctx: EmulatorContext<ComputerInternalState>;
  label: string;
  prop: ComputerStringProp;
  ifUnset: string;
}) {
  return (
    <>
      {label}
      <input
        type="text"
        value={ctx.state[prop] ?? ifUnset}
        onChange={(ev) => {
          // I hope this warning is a mistake...

          // eslint-disable-next-line react-hooks/immutability
          ctx.state[prop] = ev.target.value;
          ctx.updateState();
        }}
        className={
          "flex-1 bg-zinc-800 w-full px-2 py-1 rounded-md border-b " +
          (typeof ctx.state[prop] == "undefined" ? "" : "text-yellow-400")
        }
      />
    </>
  );
}

export function impostazioniDiRete(
  ctx: EmulatorContext<ComputerInternalState>,
) {
  const dnsOrErr = getDns(ctx);
  const dns = typeof dnsOrErr == "string" ? undefined : dnsOrErr;
  return (
    <>
      {ctx.state.netSeterror_t ? <p>{ctx.state.netSeterror_t}</p> : <></>}
      <form
        className="flex flex-col"
        onSubmit={(ev) => {
          ev.preventDefault();
          try {
            if (
              typeof ctx.state.fieldIp_t == "string" ||
              typeof ctx.state.fieldSubnet_t == "string"
            ) {
              if (ctx.state.l3Ifs[0] == null) {
                if (typeof ctx.state.fieldIp_t == "undefined")
                  throw "Indirizzo IP non presente";
                if (typeof ctx.state.fieldSubnet_t == "undefined")
                  throw "Subnet mask non presente";
                const ip =
                  parseIpv4(ctx.state.fieldIp_t) ??
                  throwString("Indirizzo IP non valido");
                const mask =
                  parseIpv4(ctx.state.fieldSubnet_t) ??
                  throwString("Subnet mask non valida");
                ctx.state.l3Ifs[0] = { ip, mask };
              } else if (
                ctx.state.fieldIp_t === "" &&
                ctx.state.fieldSubnet_t === ""
              ) {
                ctx.state.l3Ifs[0] = null;
              } else {
                if (
                  typeof ctx.state.fieldIp_t != "undefined" &&
                  ctx.state.fieldIp_t !== ""
                ) {
                  ctx.state.l3Ifs[0].ip =
                    parseIpv4(ctx.state.fieldIp_t) ??
                    throwString("Indirizzo IP non valido");
                  delete ctx.state.fieldIp_t; // early delete to handle right ip with wrong subnet
                }
                if (
                  typeof ctx.state.fieldSubnet_t != "undefined" &&
                  ctx.state.fieldSubnet_t !== ""
                ) {
                  ctx.state.l3Ifs[0].mask =
                    parseIpv4(ctx.state.fieldSubnet_t) ??
                    throwString("Subnet mask non valida");
                }
              }
              delete ctx.state.fieldSubnet_t;
              delete ctx.state.fieldIp_t;
            }
            if (typeof ctx.state.fieldDns_t == "string") {
              if (ctx.state.fieldDns_t == "") {
                removeFile(ctx.state.filesystem, "/etc/dns");
              } else {
                if (typeof parseIpv4(ctx.state.fieldDns_t) == "undefined")
                  throw "Indirizzo DNS non valido";
                writeFileInLocation(
                  ctx.state.filesystem,
                  "/etc/dns",
                  ctx.state.fieldDns_t,
                );
              }
              delete ctx.state.fieldDns_t;
            }
            if (typeof ctx.state.fieldGateway_t == "string") {
              if (ctx.state.fieldGateway_t == "") {
                ctx.state.gateway = IPV4_BROADCAST;
              } else {
                const ip =
                  parseIpv4(ctx.state.fieldGateway_t) ??
                  throwString("Indirizzo gateway non valido");
                ctx.state.gateway = ip;
              }
              delete ctx.state.fieldGateway_t;
            }
            delete ctx.state.netSeterror_t;
          } catch (e) {
            ctx.state.netSeterror_t = e as string;
          }
          ctx.updateState();
        }}
      >
        <NetworkField
          ctx={ctx}
          label="Indirizzo IP"
          prop="fieldIp_t"
          ifUnset={
            ctx.state.l3Ifs[0] ? ipv4ToString(ctx.state.l3Ifs[0].ip) : ""
          }
        />
        <NetworkField
          ctx={ctx}
          label="Subnet mask"
          prop="fieldSubnet_t"
          ifUnset={
            ctx.state.l3Ifs[0] ? ipv4ToString(ctx.state.l3Ifs[0].mask) : ""
          }
        />
        <NetworkField
          ctx={ctx}
          label="Gateway"
          prop="fieldGateway_t"
          ifUnset={ipv4ToString(ctx.state.gateway)}
        />
        <NetworkField
          ctx={ctx}
          label="DNS"
          prop="fieldDns_t"
          ifUnset={typeof dns == "undefined" ? "" : ipv4ToString(dns)}
        />
        <Button className="bg-zinc-800 hover:brightness-110 active:brightness-130">
          Imposta
        </Button>
      </form>
    </>
  );
}
