import { ARPPacket } from "@/app/protocols/rfc_826";
import { RouterInternalState } from "../../devices/list/Router";
import { EthernetFrameSerializer, EtherType } from "../../protocols/802_3";
import { ICMPPacket, ICMPType } from "../../protocols/icmp";
import {
  getMatchingInterface,
  ipv4ToString,
  parseIpv4,
  PartialIPv4Packet,
  ProtocolCode,
} from "../../protocols/rfc_760";
import { hello } from "../../virtualPrograms/hello";
import { interfacesL3 } from "../../virtualPrograms/interfacesl3";
import { l2send } from "../../virtualPrograms/l2send";
import { ping } from "../../virtualPrograms/ping";
import { DeviceEmulator, runOnInterpreter } from "../DeviceEmulator";
import { arptable } from "@/app/virtualPrograms/arptable";
import { udpSend } from "@/app/virtualPrograms/udpSend";
import { UDPSerializer } from "@/app/protocols/udp";
import { handleArpPacket } from "../utils/handleArpPacket";
import { forwardIPv4Packet, sendIPv4Packet } from "../utils/sendIPv4Packet";
import { countLeadingOnes, throwString } from "@/app/common";
import { Button } from "@/app/editorComponents/RoundBtn";
import { routing } from "@/app/virtualPrograms/routing";
import { gatewayCmd } from "@/app/virtualPrograms/gateway";
import { DropDown } from "@/app/editorComponents/DropDown";

export const routerEmulator: DeviceEmulator<RouterInternalState> = {
  configPanel: {
    interfacce(ctx) {
      const selectedIntfIdx = ctx.state.ifSelected_t ?? 0;
      const interfaces = ctx.state.netInterfaces.map(
        (intf, idx) => `${idx + 1} - ${intf.name}`,
      );
      const l2if = ctx.state.netInterfaces[selectedIntfIdx];
      const l3if = ctx.state.l3Ifs.at(selectedIntfIdx);
      return (
        <>
          <DropDown
            open={ctx.state.ifOpenDropDown_t ?? true}
            setOpen={(open) => {
              ctx.state.ifOpenDropDown_t = open;
              ctx.updateState();
            }}
            selected={interfaces[selectedIntfIdx]}
            setSelected={(sel) => {
              ctx.state.ifSelected_t = +sel.split(" - ")[0] - 1;
              ctx.state.ifOpenDropDown_t = false;
              ctx.state.ifIpInput_t = undefined;
              ctx.state.ifSubnetInput_t = undefined;
              ctx.updateState();
            }}
            panels={interfaces}
          />
          <p>Nome: {l2if.name}</p>
          <p>
            Tipo: {l2if.type} {l2if.maxMbps}&nbsp;Mbps
          </p>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.target as HTMLFormElement);
              try {
                const ip = (fd.get("ip") as string) ?? throwString("Empty ip");
                const subnet =
                  (fd.get("subnet") as string) ?? throwString("Empty subnet");

                const parsedIp =
                  parseIpv4(ip) ?? throwString("Invalid ip " + ip);
                const parsedSubnet =
                  parseIpv4(subnet) ??
                  throwString("Invalid subnet mask " + subnet);

                ctx.state.l3Ifs[selectedIntfIdx] = {
                  ip: parsedIp,
                  mask: parsedSubnet,
                };
                ctx.state.ifIpInput_t = undefined;
                ctx.state.ifSubnetInput_t = undefined;
                ctx.updateState();
              } catch (e) {
                // TODO: find a better way to notify
                alert(e);
              }
            }}
          >
            <p>
              Indirizzo ip:
              <input
                type="text"
                name="ip"
                value={
                  ctx.state.ifIpInput_t ?? (l3if ? ipv4ToString(l3if.ip) : "")
                }
                onChange={(ev) => {
                  ctx.state.ifIpInput_t = ev.target.value;
                  ctx.updateState();
                }}
                className={
                  typeof ctx.state.ifIpInput_t == "undefined"
                    ? ""
                    : "text-amber-400"
                }
                placeholder="0.0.0.0"
              />
            </p>
            <p>
              Subnet mask:
              <input
                type="text"
                name="subnet"
                value={
                  ctx.state.ifSubnetInput_t ??
                  (l3if ? ipv4ToString(l3if.mask) : "")
                }
                onChange={(ev) => {
                  ctx.state.ifSubnetInput_t = ev.target.value;
                  ctx.updateState();
                }}
                className={
                  typeof ctx.state.ifSubnetInput_t == "undefined"
                    ? ""
                    : "text-amber-400"
                }
                placeholder="255.255.255.0"
              />
            </p>
            <Button
              type="submit"
              className="bg-zinc-800 disabled:opacity-70"
              disabled={
                typeof ctx.state.ifSubnetInput_t == "undefined" &&
                typeof ctx.state.ifIpInput_t == "undefined"
              }
            >
              Imposta
            </Button>{" "}
            <Button
              type="button"
              className="bg-zinc-800"
              onClick={() => {
                ctx.state.l3Ifs[selectedIntfIdx] = null;
                ctx.updateState();
              }}
            >
              Pulisci indirizzo
            </Button>
          </form>
        </>
      );
    },
    "Tabelle di routing"(ctx) {
      return (
        <>
          <div>
            Inserisci nuova <br />
            Rete:
            <input
              type="text"
              placeholder="1.1.1.0/24"
              value={ctx.state.rtNetworkInput_t ?? ""}
              onChange={(ev) => {
                ctx.state.rtNetworkInput_t = ev.target.value;
                ctx.updateState();
              }}
            />
            <br />
            Next hop:
            <input
              type="text"
              placeholder="10.1.1.2"
              value={ctx.state.rtDestinationInput_t ?? ""}
              onChange={(ev) => {
                ctx.state.rtDestinationInput_t = ev.target.value;
                ctx.updateState();
              }}
            />
            <Button
              className="bg-slate-500"
              onClick={() => {
                ctx.args = [
                  "routing",
                  "add",
                  ctx.state.rtNetworkInput_t ?? "",
                  ctx.state.rtDestinationInput_t ?? "",
                ];
                ctx.write("> " + ctx.args.join(" "));
                runOnInterpreter(ctx);
              }}
            >
              Aggiungi
            </Button>
          </div>
          {ctx.state.routingTables.length != 0 ? (
            <table>
              <thead>
                <tr>
                  <th className="p-1"></th>
                  <th className="p-1">Rete</th>
                  <th className="p-1">Next hop</th>
                </tr>
              </thead>
              <tbody>
                {ctx.state.routingTables.map((tableEntry, idx) => (
                  <tr key={idx}>
                    <td>
                      <Button
                        onClick={() => {
                          ctx.args = `routing set-priority ${idx} -1`.split(
                            " ",
                          );
                          runOnInterpreter(ctx);
                        }}
                      >
                        ⬆️
                      </Button>
                      <Button
                        onClick={() => {
                          ctx.args = `routing set-priority ${idx} 1`.split(" ");
                          runOnInterpreter(ctx);
                        }}
                      >
                        ⬇️
                      </Button>
                      <Button
                        onClick={() => {
                          ctx.args = `routing remove ${idx}`.split(" ");
                          runOnInterpreter(ctx);
                        }}
                      >
                        ✖️
                      </Button>
                    </td>
                    <td className="p-1">
                      {ipv4ToString(tableEntry.netAddr)}/
                      {countLeadingOnes(tableEntry.mask)}
                    </td>
                    <td className="p-1">{ipv4ToString(tableEntry.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            "Nessuna rotta inserita"
          )}
        </>
      );
    },
  },
  packetHandler(ctx, data, intf) {
    const l2Packet = EthernetFrameSerializer.fromBytes(data);
    if (l2Packet.lenOrEthertype == EtherType.arp) {
      handleArpPacket(ctx, ARPPacket.fromL2(l2Packet), intf);
      return;
    }
    try {
      const destination = PartialIPv4Packet.getDestination(l2Packet.payload);
      const isDestinedInterface = ctx.state.l3Ifs.findIndex(
        (v) => v && v.ip == destination,
      );

      let packet = new PartialIPv4Packet(l2Packet.payload);

      // Non è indirizzato a me?
      if (isDestinedInterface == -1) {
        const sendTo = getMatchingInterface(ctx.state.l3Ifs, destination);
        // È su una mia interfaccia?
        if (sendTo != -1 && sendTo != intf) {
          forwardIPv4Packet(ctx, packet, packet.destination);
        } else {
          // Controllo le tabelle di routing
          const nextHop = ctx.state.routingTables.find(
            (entry) =>
              (destination & entry.mask) == (entry.netAddr & entry.mask),
          )?.to;
          if (typeof nextHop != "undefined") {
            forwardIPv4Packet(ctx, packet, nextHop);
          }
        }
        return;
      }

      if (!packet.isPayloadFinished()) {
        const packets = ctx.state.ipPackets_t;
        if (!ctx.state.ipPackets_t.has(packet.id)) {
          packets.set(packet.id, packet);
        } else {
          packets.get(packet.id)!.add(l2Packet.payload);
        }
        packet = packets.get(packet.id)!;
        if (!packet.isPayloadFinished()) {
          ctx.updateState();
          return;
        }
        // Il payload è concluso, elimina il pacchetto dalla coda
        packets.delete(packet.id);
      }

      switch (packet.protocol) {
        case ProtocolCode.icmp:
          const icmpPacket = ICMPPacket.fromBytes(packet.payload);
          // Gestisci i pacchetti echo ICMP
          switch (icmpPacket.type) {
            case ICMPType.echoRequest:
              sendIPv4Packet(
                ctx,
                packet.source,
                ProtocolCode.icmp,
                ICMPPacket.echoResponse(icmpPacket).toBytes(),
              );
              break;
            default:
              if (ctx.state.rawSocketFd_t)
                ctx.state.rawSocketFd_t(ctx as any, packet);
          }
          break;
        case ProtocolCode.udp:
          const udpPacket = UDPSerializer.fromBytes(packet.payload);
          if (ctx.state.udpSocket_t)
            ctx.state.udpSocket_t(udpPacket, packet.source);
          break;
      }
      ctx.updateState();
    } catch (e) {
      console.log(e);
    }
  },
  cmdInterpreter: {
    shell: {
      subcommands: {
        hello,
        interfaces: interfacesL3,
        l2send,
        ping: ping as any,
        arptable,
        "udp-send": udpSend,
        routing,
        gateway: gatewayCmd as any,
      },
    },
  },
};
