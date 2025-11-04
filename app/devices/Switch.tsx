import { switchEmulator } from "../emulators/switchEmulator";
import { DeviceFactory } from "./Device";

export const Switch: DeviceFactory = {
  iconId: "#switch-icon",
  emulator: switchEmulator,
  deviceType: "switch",
  defaultState() {
    return {
      netInterfaces: ['interface_a', 'interface_b']
    }
  }
}
