import { Layer2Packet, MAC_BROADCAST } from "../protocols/802_3";
import { hello } from "../virtualPrograms/hello";
import { interfaces } from "../virtualPrograms/interfaces";
import { l2send } from "../virtualPrograms/l2send";
import { DeviceEmulator, InternalState } from "./DeviceEmulator";

export const routerEmulator: DeviceEmulator<InternalState<{}>> = {
  configPanel: {
    interfacce(ctx) {
      return (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Max speed</th>
            </tr>
          </thead>
          <tbody>
            {ctx.state.netInterfaces.map((val, idx) =>
              <tr key={idx}>
                <td>{val.name}</td>
                <td>{val.type}</td>
                <td>{val.maxMbps} Mbps</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    },
  },
  packetHandler(ctx, data, intf) {
    console.log("Got data", data, "on intf", intf, "ctx:", ctx);
    const recved = Layer2Packet.fromBytes(data.buffer);
    if (recved.to == MAC_BROADCAST) {
      ctx.sendOnIf(intf, new Layer2Packet(
        new ArrayBuffer(0),
        ctx.state.netInterfaces[intf].mac,
        recved.from
      ).toBytes())
    }
  },
  cmdInterpreter: {
    shell: {
      desc: "Command",
      subcommands: {
        hello,
        interfaces,
        l2send
      }
    }
  }
};

