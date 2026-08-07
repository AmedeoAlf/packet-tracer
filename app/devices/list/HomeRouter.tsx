import { randomMAC } from "@/app/protocols/802_3";
import { defaultL3InternalState, parseIpv4 } from "@/app/protocols/rfc_760";
import { DeviceFactory } from "../Device";
import { Router, RouterInternalState } from "./Router";

export const HomeRouter: DeviceFactory<RouterInternalState> = {
  proto: Router.proto,
  defaultState() {
    const lanIp = parseIpv4("192.168.1.1")!;
    return {
      ...defaultL3InternalState(),
      netInterfaces: [
        { name: "if0", maxMbps: 1000, type: "copper", mac: randomMAC() },
        { name: "se0", maxMbps: 1000, type: "serial", mac: randomMAC() },
      ],
      routingTables: [],
      l3Ifs: [{ ip: lanIp, mask: 0xffffff00 }],
      dhcpSettings: {
        gateway: lanIp,
        network: lanIp,
        mask: 0xffffff00,
        dns: 0x0,
        excluded: [],
      },
      aclRules: [],
      assignedACLs: [],
      assignedACLsOut: [],
    };
  },
};

export default HomeRouter;
