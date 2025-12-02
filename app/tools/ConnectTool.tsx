import { ReactNode } from "react";
import { Device } from "../devices/Device";
import { Tool, ToolCtx } from "./Tool";
import { toInterfaceId } from "../Project";
import { NetworkInterface } from "../emulators/DeviceEmulator";

export type ConnectTool = Tool & {
  deviceA?: Device,
  idxA: number,
  deviceB?: Device,
  idxB: number
  errorMsg?: string
}

function clearSelection(c: ConnectTool) {
  c.deviceA = undefined;
  c.idxA = 0;
  c.deviceB = undefined;
  c.idxB = 0;
  c.errorMsg = undefined;
  c.update();
}

export function makeConnectTool(ctx: ToolCtx): ConnectTool {
  return {
    deviceA: undefined,
    idxA: 0,
    deviceB: undefined,
    idxB: 0,
    errorMsg: undefined,
    ...ctx,
    toolname: "connect",
    panel() {
      return <></>
    },
    onEvent(ev) {
      const firstEmptyInterface = (device: Device): number => {
        const res = device.internalState.netInterfaces.findIndex(
          (_, idx) => this.project.getConnectedTo(toInterfaceId(device.id, idx)) == undefined
        )
        return res == -1 ? 0 : res;
      }
      switch (ev.type) {
        case "click":
          switch (true) {
            case !ev.device:
              clearSelection(this);
              return;
            case !this.deviceA:
              this.deviceA = ev.device;
              this.idxA = firstEmptyInterface(this.deviceA);
              this.update();
              return;
            case !this.deviceB:
              this.deviceB = ev.device;
              this.idxB = firstEmptyInterface(this.deviceB);
              this.update();
              return;
          }
      }

    },
    svgElements() { return <></> },
  }
}
