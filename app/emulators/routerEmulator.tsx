import { hello } from "../virtualPrograms/hello";
import { interfaces } from "../virtualPrograms/interfaces";
import { DeviceEmulator, InternalState } from "./DeviceEmulator";

export const routerEmulator: DeviceEmulator<InternalState<{}>> = {
  configPanel: {
    interfacce(ctx) {
      return (
        <ul>
          {ctx.state.netInterfaces.map((val, idx) => <li key={idx}>{val}</li>)}
        </ul>
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

