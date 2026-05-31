import { EmulatorContext, runOnInterpreter } from "../DeviceEmulator";
import { RouterInternalState } from "@/app/devices/list/Router";
import { NetworkFieldOfState } from "./impostazioniDiRete";
import { ipv4ToString, parseIpv4 } from "@/app/protocols/rfc_760";
import { Button } from "@/app/editorComponents/reusable/RoundBtn";
import { throwString } from "@/app/common";

export type DHCPUIFields = Partial<
  Record<
    "network" | "mask" | "gateway" | "dns" | "excluded",
    string | undefined
  >
>;

interface DHCPUIInternalState extends RouterInternalState {
  dhcpUiFields_t?: DHCPUIFields;
}

export const dhcpPanel = (ctx: EmulatorContext<DHCPUIInternalState>) => {
  ctx.state.dhcpUiFields_t ??= {};
  return (
    <div className="flex flex-col overflow-auto">
      <div>
        Abilitato:&nbsp;
        <input
          type="checkbox"
          checked={!!ctx.state.dhcpSettings}
          onChange={(ev) => {
            runOnInterpreter({
              ...ctx,
              args: ["dhcp", ev.target.checked ? "on" : "off"],
            });
          }}
        />
      </div>
      {ctx.state.dhcpSettings && (
        <form
          method="dialog"
          onSubmit={() => {
            if (!ctx.state.dhcpUiFields_t) return;

            const parseField = (field: keyof DHCPUIFields) => {
              const ipStr = ctx.state.dhcpUiFields_t![field];
              if (!ipStr) return;
              (ctx.state.dhcpSettings![field] as number) =
                parseIpv4(ipStr) ??
                throwString(`Invalid ip ${ipStr} for ${field}`);
            };

            try {
              parseField("network");
              parseField("mask");
              parseField("gateway");
              parseField("dns");
              const excluded = ctx.state.dhcpUiFields_t.excluded;
              if (excluded != null) {
                const pairs = excluded
                  .split("\n")
                  .map(
                    (it) => it.split("-").map(parseIpv4) as [number, number],
                  );
                for (const [line, p] of pairs.entries())
                  if (p.length != 2 || p[0] == null || p[1] == null)
                    throwString(
                      `Invalid value for excluded addresses field (line ${line + 1})`,
                    );

                ctx.state.dhcpSettings!.excluded = pairs;
              }
              ctx.state.dhcpUiFields_t = {};
              ctx.updateState();
            } catch (e) {
              // TODO: find a better way to notify
              alert(e);
            }
          }}
        >
          <NetworkFieldOfState
            label="Rete"
            state={ctx.state.dhcpUiFields_t}
            updateState={ctx.updateState}
            ifUnset={ipv4ToString(ctx.state.dhcpSettings.network)}
            prop="network"
          />
          <NetworkFieldOfState
            label="Subnet mask"
            state={ctx.state.dhcpUiFields_t}
            updateState={ctx.updateState}
            ifUnset={ipv4ToString(ctx.state.dhcpSettings.mask)}
            prop="mask"
          />
          <NetworkFieldOfState
            label="Gateway"
            state={ctx.state.dhcpUiFields_t}
            updateState={ctx.updateState}
            ifUnset={ipv4ToString(ctx.state.dhcpSettings.gateway)}
            prop="gateway"
          />
          <NetworkFieldOfState
            label="DNS"
            state={ctx.state.dhcpUiFields_t}
            updateState={ctx.updateState}
            ifUnset={ipv4ToString(ctx.state.dhcpSettings.dns)}
            prop="dns"
          />
          IP esclusi:
          <textarea
            className="w-full bg-background rounded-sm p-2 h-25 font-mono"
            placeholder={`1.1.1.1-1.1.1.255
1.2.1.1-1.2.255.255`}
            value={
              ctx.state.dhcpUiFields_t.excluded ??
              ctx.state.dhcpSettings.excluded
                .map(([a, b]) => `${ipv4ToString(a)}-${ipv4ToString(b)}`)
                .join("\n")
            }
            onChange={(ev) => {
              ctx.state.dhcpUiFields_t ??= {};
              ctx.state.dhcpUiFields_t.excluded = ev.target.value;
              ctx.updateState();
            }}
          ></textarea>
          <Button className="bg-onsidebar">Applica</Button>
        </form>
      )}
    </div>
  );
};
