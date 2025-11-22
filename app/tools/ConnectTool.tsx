import { ReactNode } from "react";
import { Device } from "../devices/Device";
import { Tool, ToolCtx } from "./Tool";
import { toInterfaceId } from "../Project";

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
      const SelectIntfComponent = (device: Device, setIntf: (i: number) => void, intfIdx: number): ReactNode => {
        return (
          <>
            <p>{device.name}</p>
            <select value={intfIdx} onChange={ev => { setIntf(+ev.target.value); this.update() }}>
              {[...device.internalState.netInterfaces.entries()
                .map(([idx, val]) => <option key={idx} value={idx}>{val.name} ({val.type} {val.maxMbps})</option>)]}
            </select>
          </>
        )
      }
      return (
        <div>
          {this.errorMsg ? <p>Errore {this.errorMsg}</p> : undefined}
          {!this.deviceA
            ? <p>Seleziona il primo dispositivo</p>
            : <>
              {SelectIntfComponent(this.deviceA, (n) => this.idxA = n, this.idxA)}
              {!this.deviceB
                ? <p>Seleziona il secondo dispositivo</p>
                : <>
                  {SelectIntfComponent(this.deviceB, (n) => this.idxB = n, this.idxB)}
                  <button onClick={() => {
                    this.errorMsg = this.project.connect(
                      // Gli operatori ternari garantiscono che i valori non siano undefined
                      this.deviceA!!.id, this.idxA!!,
                      this.deviceB!!.id, this.idxB!!,
                    );
                    this.updateProject();
                    if (!this.errorMsg) clearSelection(this);
                  }}>Connetti</button>
                </>
              }
            </>
          }
        </div>
      )
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
