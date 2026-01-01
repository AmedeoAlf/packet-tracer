import { Device } from "../devices/Device";
import { Tool, ToolCtx } from "./Tool";
import { Coords } from "../common";
import { intfColor } from "../editorComponents/Cables";
import { toInterfaceId } from "../ProjectManager";
import { NetworkInterface } from "../emulators/DeviceEmulator";
import { Button } from "../editorComponents/RoundBtn";

export type ConnectTool = Tool & {
  deviceA?: Device;
  idxA?: number;
  deviceB?: Device;
  idxB?: number;
  errorMsg?: string;
  cursorPos?: Coords;
};

function clearSelection(c: ConnectTool) {
  c.deviceA = undefined;
  c.idxA = undefined;
  c.deviceB = undefined;
  c.idxB = undefined;
  c.errorMsg = undefined;
  c.update();
}

function canConnect(
  c: Pick<ConnectTool, "deviceA" | "idxA" | "deviceB" | "idxB">,
) {
  return (
    c.idxA !== undefined &&
    c.idxB !== undefined &&
    intfType(c.deviceA!, c.idxA) == intfType(c.deviceB!, c.idxB)
  );
}

function connect(c: ConnectTool) {
  if (!canConnect(c))
    throw "ArgumentException: can't access ConnectTool.idxA/.idxB";
  c.project.connect(c.deviceA!.id, c.idxA!, c.deviceB!.id, c.idxB!);
  clearSelection(c);
  c.updateProject();
}
function intfType(dev: Device, intf: number) {
  return dev.internalState.netInterfaces[intf].type;
}

export function makeConnectTool(ctx: ToolCtx): ConnectTool {
  return {
    deviceA: undefined,
    idxA: undefined,
    deviceB: undefined,
    idxB: undefined,
    errorMsg: undefined,
    ...ctx,
    toolname: "connect",
    panel() {
      return (
        <>
          <div className="p-2">
            {canConnect(this) ? (
              <Button
                onClick={() => connect(this)}
                className="w-full p-0 bg-green-900 text-green-200 hover:bg-green-800 active:bg-green-700"
              >
                Collega [c]
              </Button>
            ) : (
              <Button className="w-full p-0 bg-gray-800 text-gray-500">
                Seleziona due interfacce compatibili
              </Button>
            )}
          </div>
          <div className="flex flex-wrap indent-0">
            {!this.deviceA ? (
              <>Seleziona il primo dispositivo</>
            ) : (
              <>
                <InterfaceSelector
                  device={this.deviceA}
                  selectIntf={(n) => {
                    this.idxA = n;
                    this.update();
                  }}
                  intfIdx={this.idxA}
                  connectTool={this}
                />
                {!this.deviceB ? (
                  <>Seleziona il secondo dispositivo</>
                ) : (
                  <InterfaceSelector
                    device={this.deviceB}
                    connectTool={this}
                    intfIdx={this.idxB}
                    selectIntf={(n) => {
                      this.idxB = n;
                      this.update();
                    }}
                  />
                )}
              </>
            )}
            <button></button>
          </div>
        </>
      );
    },
    onEvent(ev) {
      const firstEmptyInterface = (
        device: Device,
        type?: NetworkInterface["type"],
      ): number => {
        let firstIf: number | undefined = undefined;
        const res = device.internalState.netInterfaces.findIndex((_, idx) => {
          if (
            this.project.getConnectedTo(toInterfaceId(device.id, idx)) ==
            undefined
          ) {
            firstIf ??= idx;
            return (
              type === undefined ||
              device.internalState.netInterfaces[idx].type === type
            );
          }
          return false;
        });
        return res == -1 ? (firstIf ?? 0) : res;
      };
      switch (ev.type) {
        case "click":
          switch (true) {
            case !ev.device:
              clearSelection(this);
              return;
            case !this.deviceA:
              this.deviceA = ev.device;
              this.idxA = firstEmptyInterface(this.deviceA);
              this.cursorPos = ev.pos;
              this.update();
              return;
            case !this.deviceB:
              this.deviceB = ev.device;
              this.idxB = firstEmptyInterface(this.deviceB);
              this.update();
              return;
          }
          break;
        case "mousemove":
          if (this.deviceA) {
            this.cursorPos = ev.pos;
            this.update();
          }
          break;
        case "keydown":
          if (ev.key == "c" && canConnect(this)) {
            connect(this);
            ev.consumed = true;
          }
      }
    },
    svgElements() {
      if (this.deviceA && this.idxA !== undefined) {
        if (this.idxB !== undefined) {
          const typeA = intfType(this.deviceA, this.idxA);

          const lineColor =
            intfType(this.deviceB!, this.idxB) === typeA
              ? intfColor[intfType(this.deviceA, this.idxA)]
              : "red";
          return (
            <line
              x1={this.deviceA.pos.x}
              y1={this.deviceA.pos.y}
              x2={this.deviceB!.pos.x}
              y2={this.deviceB!.pos.y}
              stroke={lineColor}
              strokeWidth={3}
              strokeDasharray="10 10"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="0;20"
                dur="2s"
                repeatCount="indefinite"
              />
            </line>
          );
        } else if (this.cursorPos) {
          return (
            <line
              x1={this.deviceA.pos.x}
              y1={this.deviceA.pos.y}
              x2={this.cursorPos.x}
              y2={this.cursorPos.y}
              stroke={intfColor[intfType(this.deviceA, this.idxA)]}
            />
          );
        }
      }
      return <></>;
    },
  };
}

function InterfaceSelector({
  device,
  intfIdx,
  selectIntf,
  connectTool,
}: {
  device: Device;
  intfIdx?: number;
  selectIntf: (idx: number) => void;
  connectTool: Pick<ConnectTool, "project" | "updateProject" | "update">;
}) {
  const isConnected = (i: number) =>
    connectTool.project.getConnectedTo(toInterfaceId(device.id, i)) !==
    undefined;
  return (
    <div className="p-[10px] w-[50%] text-black">
      <div className="resize-none rounded-md bg-white h-6 w-full mb-[10px]">
        {device.name}
      </div>

      {device.internalState.netInterfaces.map((intf, i) => (
        <div key={i} className="flex items-center justify-between m-1">
          <div className="bg-white h-6 w-17 rounded-md">{intf.name}</div>
          {/*
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer"></input>
          <div className="w-16 h-8 bg-red-500 rounded-full peer-checked:bg-green-500"></div>
          <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition peer-checked:translate-x-8"></div>
        </label>
        */}
          {i === intfIdx ? (
            <Button className="text-blue-900 bg-blue-400">Selezionata</Button>
          ) : isConnected(i) ? (
            <Button
              onClick={() => {
                connectTool.project.disconnect(device.id, i);
                connectTool.updateProject();
                selectIntf(i);
              }}
              className="text-red-900 bg-red-400 hover:brightness-130 active:bg-red-300 active:brightness-100"
            >
              Scollega
            </Button>
          ) : (
            <Button
              onClick={() => selectIntf(i)}
              className="text-slate-900 bg-slate-400 hover:brightness-110 active:brightness-120"
            >
              Seleziona
            </Button>
          )}
        </div>
      ))}

      {/* <div className="flex justify-center items-center gap-6 pt-6"> */}
      {/*   <span className="text-white text-2xl cursor-pointer">&lt;</span> */}
      {/*   <div className="bg-white rounded-md w-10 h-6"></div> */}
      {/*   <span className="text-white text-2xl cursor-pointer">&gt;</span> */}
      {/* </div> */}
    </div>
  );
}
