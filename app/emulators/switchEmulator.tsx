import { hello } from "../virtualPrograms/hello";
import { interfaces } from "../virtualPrograms/interfaces";
import { DeviceEmulator, InternalState } from "./DeviceEmulator";

export const switchEmulator: DeviceEmulator<InternalState<{}>> = {
  configPanel: {
    "pannello meme"() {
      return (<p>Questo pannello serve solo a dimostrare che gli switch hanno un pannello differente dai router</p>
      )
    },
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
  cmdInterpreter: {
    shell: {
      desc: "Command",
      subcommands: {
        hello,
        interfaces
      }
    }
  }
};

