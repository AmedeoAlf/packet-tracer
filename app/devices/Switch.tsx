import { switchEmulator } from "../emulators/switchEmulator";
import { DeviceFactory } from "./Device";

export const Switch: DeviceFactory = {
  iconId: "#switch-icon",
  emulator: switchEmulator,
  deviceType: "switch",
  defaultState() {
    return {
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper" },
        { name: "if1", maxMbps: 100, type: "copper" },
      ]
    }
  }
}
