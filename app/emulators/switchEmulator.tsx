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
        <ul>
          {ctx.state.netInterfaces.map((val, idx) => <li key={idx}>{val}</li>)}
        </ul>
      );
    },
  },
  cmdInterpreter: {
    shell: {
      desc: "",
      subcommands: {
        hello,
        interfaces
      }
    }
  }
};

