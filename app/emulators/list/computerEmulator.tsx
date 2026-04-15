import {
  IPV4_BROADCAST,
  IPv4Address,
  IPv4Packet,
  ipv4ToString,
  parseIpv4,
  ProtocolCode,
} from "../../protocols/rfc_760";
import { hello } from "../../virtualPrograms/hello";
import { interfacesL3 } from "../../virtualPrograms/interfacesl3";
import { l2send } from "../../virtualPrograms/l2send";
import { ping } from "../../virtualPrograms/ping";
import { DeviceEmulator, EmulatorContext } from "../DeviceEmulator";
import { arptable } from "@/app/virtualPrograms/arptable";
import { udpSend } from "@/app/virtualPrograms/udpSend";
import { UDPSerializer } from "@/app/protocols/udp";
import {
  ComputerInternalState,
  OSInternalState,
} from "@/app/devices/list/Computer";
import { nslookup } from "@/app/virtualPrograms/nslookup";
import { cat } from "@/app/virtualPrograms/cat";
import { writeFile } from "@/app/virtualPrograms/writeFile";
import { ls } from "@/app/virtualPrograms/ls";
import { recvIPv4Packet } from "../utils/recvIPv4Packet";
import { TCPPacket } from "@/app/protocols/tcp";
import { sendIPv4Packet } from "../utils/sendIPv4Packet";
import { tcphello } from "@/app/virtualPrograms/tcpsend";
import { tcplisten } from "@/app/virtualPrograms/tcplisten";
import { curl } from "@/app/virtualPrograms/curl";
import { gatewayCmd } from "@/app/virtualPrograms/gateway";
import { KeysOfType, throwString } from "@/app/common";
import { getDns } from "../utils/dnsUtils";
import { Button } from "@/app/editorComponents/RoundBtn";
import { removeFile, writeFileInLocation } from "../utils/osFiles";

export type OSUDPPacket = {
  from: IPv4Address;
  fromPort: number;
  toPort: number;
  payload: Buffer;
};

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

export const computerEmulator: DeviceEmulator<ComputerInternalState> = {
  configPanel: {
    "Impostazioni di rete"(ctx) {
      const dns = getDns(ctx);
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
    },
  },
  packetHandler(ctx, data, intf) {
    const packet = recvIPv4Packet(ctx, data, intf);
    if (packet) computerPacketHandler(ctx, packet);
  },
  cmdInterpreter: {
    shell: {
      subcommands: {
        hello: hello,
        interfaces: interfacesL3,
        l2send: l2send,
        ping: ping as any,
        arptable: arptable,
        "udp-send": udpSend,
        nslookup: nslookup,
        cat: cat,
        writeFile: writeFile,
        ls: ls,
        tcphello,
        tcplisten,
        curl,
        gateway: gatewayCmd,
      },
    },
  },
};

export function computerPacketHandler(
  ctx: EmulatorContext<OSInternalState>,
  packet: IPv4Packet,
) {
  switch (packet.protocol) {
    case ProtocolCode.udp:
      const udpPacket = UDPSerializer.fromBytes(packet.payload);
      const completed = ctx.state.udpSockets_t
        .get(udpPacket.destination)
        ?.call(null, [
          ctx,
          {
            from: packet.source,
            fromPort: udpPacket.source,
            toPort: udpPacket.destination,
            payload: udpPacket.payload,
          },
        ]);
      if (completed) ctx.state.udpSockets_t.delete(udpPacket.destination);
      break;
    case ProtocolCode.tcp:
      tcpPacketHandler(ctx, packet);
      break;
  }
  ctx.updateState();
}

export function tcpPacketHandler(
  ctx: EmulatorContext<OSInternalState>,
  packet: IPv4Packet,
) {
  if (packet.protocol !== ProtocolCode.tcp)
    throw "Why did this function get a non tcp packet?";
  const tcpPacket = TCPPacket.fromBytes(packet.payload);
  const connectionState = ctx.state.tcpSockets_t.get(tcpPacket.destination);
  if (!connectionState) return;

  const destroySocket = () => {
    ctx.state.tcpSockets_t.delete(tcpPacket.destination);
  };
  const osCallback = () =>
    connectionState.callback(ctx, tcpPacket.destination, tcpPacket.payload);
  const answerWith = (tcpPacket: TCPPacket) =>
    sendIPv4Packet(ctx, packet.source, ProtocolCode.tcp, tcpPacket.toBytes());

  switch (connectionState.state) {
    case "listen": {
      if (!tcpPacket.syn || tcpPacket.ack !== undefined) return destroySocket();
      const answer = TCPPacket.synAckPacket(tcpPacket);
      ctx.state.tcpSockets_t.set(tcpPacket.destination, {
        state: "syn_recved",
        address: packet.source,
        callback: connectionState.callback,
        port: tcpPacket.source,
        seq: answer.seq,
        ack: answer.ack!,
      });
      answerWith(answer);
      break;
    }
    case "syn_sent": {
      if (!tcpPacket.syn || tcpPacket.ack === undefined) return destroySocket();

      const answer = TCPPacket.ackPacket(tcpPacket);
      connectionState.ack = answer.ack!;
      answerWith(answer);
      connectionState.state = "connected";
      osCallback();
      break;
    }
    case "syn_recved": {
      if (tcpPacket.syn || tcpPacket.ack === undefined) return destroySocket();
      connectionState.state = "accepted";
      osCallback();
      break;
    }
    case "accepted":
      if (tcpPacket.fin) {
        connectionState.state = "closing";
        osCallback();
        ctx.state.tcpSockets_t.set(tcpPacket.destination, {
          state: "listen",
          callback: connectionState.callback,
        });
        break;
      }
    case "connected":
      if (tcpPacket.fin) {
        connectionState.state = "closing";
        osCallback();
        destroySocket();
        break;
      }
      // Packets are obviously not missing and in order
      connectionState.ack = tcpPacket.seq;
      osCallback();
      break;
  }
}
