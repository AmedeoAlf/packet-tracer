import { OSInternalState } from "@/app/devices/list/Computer";
import { EmulatorContext, InternalState } from "../DeviceEmulator";
import { getDns } from "../utils/dnsUtils";
import {
  IPV4_BROADCAST,
  ipv4ToString,
  parseIpv4,
} from "@/app/protocols/rfc_760";
import { KeysOfType, throwString } from "@/app/common";
import { removeFile, writeFileInLocation } from "../utils/osFiles";
import { Button } from "@/app/editorComponents/reusable/RoundBtn";

export function NetworkField<T extends InternalState<T>>({
  ctx,
  ...props
}: {
  ctx: Pick<EmulatorContext<T>, "state" | "updateState">;
  label: string;
  prop: KeysOfType<T, string | undefined>;
  ifUnset: string;
}) {
  return NetworkFieldOfState({
    state: ctx.state,
    updateState: ctx.updateState,
    ...props,
  });
}

export function NetworkFieldOfState<T extends object>({
  label,
  prop,
  ifUnset,
  state,
  updateState,
}: {
  label: string;
  prop: KeysOfType<T, string | undefined>;
  ifUnset: string;
  state: T;
  updateState: () => void;
}) {
  return (
    <>
      {label}
      <input
        name={prop.toString()}
        type="text"
        value={(state[prop] as string) ?? ifUnset}
        onChange={(ev) => {
          // I hope this warning is a mistake...

          (state[prop] as string) = ev.target.value;
          updateState();
        }}
        className={
          "flex-1 bg-onsidebar w-full px-2 py-1 rounded-md border-b " +
          (typeof state[prop] == "undefined" ? "" : "text-temp")
        }
      />
    </>
  );
}

export interface NetworkSettingsPanelState extends OSInternalState<NetworkSettingsPanelState> {
  fieldIp_t?: string;
  fieldSubnet_t?: string;
  fieldGateway_t?: string;
  fieldDns_t?: string;

  netSeterror_t?: string;
}

export default function impostazioniDiRete(
  ctx: EmulatorContext<NetworkSettingsPanelState>,
  intf: number = 0,
) {
  const dnsOrErr = getDns(ctx.state.filesystem);
  const dns = typeof dnsOrErr == "string" ? undefined : dnsOrErr;
  return (
    <>
      {ctx.state.netSeterror_t ? <p>{ctx.state.netSeterror_t}</p> : <></>}
      <div>
        <input
          type="checkbox"
          checked={ctx.state.dhcpEnabled[intf]}
          onChange={(ev) => {
            ctx.state.dhcpEnabled[intf] = ev.target.checked;
            ctx.state.l3Ifs[intf] = null;
            ctx.updateState();
          }}
        />
        &nbsp; DHCP
      </div>
      <form
        className="flex flex-col"
        onSubmit={(ev) => {
          ev.preventDefault();
          try {
            if (
              typeof ctx.state.fieldIp_t == "string" ||
              typeof ctx.state.fieldSubnet_t == "string"
            ) {
              if (ctx.state.l3Ifs[intf] == null) {
                if (typeof ctx.state.fieldIp_t == "undefined")
                  throwString("Indirizzo IP non presente");
                if (typeof ctx.state.fieldSubnet_t == "undefined")
                  throwString("Subnet mask non presente");
                const ip =
                  parseIpv4(ctx.state.fieldIp_t) ??
                  throwString("Indirizzo IP non valido");
                const mask =
                  parseIpv4(ctx.state.fieldSubnet_t) ??
                  throwString("Subnet mask non valida");
                ctx.state.l3Ifs[intf] = { ip, mask };
              } else if (
                ctx.state.fieldIp_t === "" &&
                ctx.state.fieldSubnet_t === ""
              ) {
                ctx.state.l3Ifs[intf] = null;
              } else {
                if (
                  typeof ctx.state.fieldIp_t != "undefined" &&
                  ctx.state.fieldIp_t !== ""
                ) {
                  ctx.state.l3Ifs[intf].ip =
                    parseIpv4(ctx.state.fieldIp_t) ??
                    throwString("Indirizzo IP non valido");
                  delete ctx.state.fieldIp_t; // early delete to handle right ip with wrong subnet
                }
                if (
                  typeof ctx.state.fieldSubnet_t != "undefined" &&
                  ctx.state.fieldSubnet_t !== ""
                ) {
                  ctx.state.l3Ifs[intf].mask =
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
                  throwString("Indirizzo DNS non valido");
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
            if (e instanceof Error) ctx.state.netSeterror_t = e.message;
            else throw e;
          }
          ctx.updateState();
        }}
      >
        <NetworkField
          ctx={ctx}
          label="Indirizzo IP"
          prop="fieldIp_t"
          ifUnset={
            ctx.state.l3Ifs[intf] ? ipv4ToString(ctx.state.l3Ifs[intf].ip) : ""
          }
        />
        <NetworkField
          ctx={ctx}
          label="Subnet mask"
          prop="fieldSubnet_t"
          ifUnset={
            ctx.state.l3Ifs[intf]
              ? ipv4ToString(ctx.state.l3Ifs[intf].mask)
              : ""
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
        <div className="h-2"></div>
        <Button className="bg-onsidebar hover:brightness-110 active:brightness-130">
          Imposta
        </Button>
      </form>
    </>
  );
}
