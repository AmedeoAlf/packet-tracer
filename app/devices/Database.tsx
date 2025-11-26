import { InternalState } from "../emulators/DeviceEmulator";
import { switchEmulator } from "../emulators/switchEmulator";
import { randomMAC } from "../protocols/802_3";
import { DeviceFactory } from "./Device";

export const Database: DeviceFactory<InternalState<object>> = {
  iconId: "#database-icon",
  emulator: switchEmulator, //Da Cambiare
  deviceType: "database",

  // Default State Switch da Cambiare
  defaultState() {
    return {
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if1", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if2", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if3", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if4", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if5", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if6", maxMbps: 100, type: "copper", mac: randomMAC() },
        { name: "if7", maxMbps: 100, type: "copper", mac: randomMAC() },
      ]
    }
  }
}
