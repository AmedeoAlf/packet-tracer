import { routerEmulator } from "../emulators/routerEmulator";
import { DeviceFactory } from "./Device";

export const Switch: DeviceFactory = {
  iconId: "#switch-icon",
  emulator: routerEmulator,
  deviceType: "switch",
  defaultState() {
    return {
      netInterfaces: ['interface_a', 'interface_b']
    }
  }
}
