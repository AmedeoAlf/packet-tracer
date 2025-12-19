import { Device } from "../devices/Device";
import { Tool, ToolCtx } from "./Tool";
import { Coords } from "../common";
import { intfColor } from "../editorComponents/Cables";
import { toInterfaceId } from "../ProjectManager";
import { ReactNode } from "react";

export type ConnectTool = Tool & {
  deviceA?: Device;
  idxA?: number;
  deviceB?: Device;
  errorMsg?: string;
  cursorPos?: Coords;
};

function clearSelection(c: ConnectTool) {
  c.deviceA = undefined;
  c.idxA = undefined;
  c.deviceB = undefined;
  c.errorMsg = undefined;
  c.update();
}

export function makeConnectTool(ctx: ToolCtx): ConnectTool {
  return {
    deviceA: undefined,
    idxA: undefined,
    deviceB: undefined,
    errorMsg: undefined,
    ...ctx,
    toolname: "connect",
    panel() {
      return (
        <div className="flex flex-wrap indent-0">
          {!this.deviceA ? (
            <>Seleziona il primo dispositivo</>
          ) : (
            <>
              <InterfaceSelector
                device={this.deviceA}
                intfIdx={this.idxA}
                connectTool={this}
              />
              {!this.deviceB ? (
                <>Seleziona il secondo dispositivo</>
              ) : (
                <InterfaceSelector device={this.deviceB} connectTool={this} />
              )}
            </>
          )}
        </div>
      );
    },
    onEvent(ev) {
      const firstEmptyInterface = (device: Device): number => {
        const res = device.internalState.netInterfaces.findIndex(
          (_, idx) =>
            this.project.getConnectedTo(toInterfaceId(device.id, idx)) ==
            undefined,
        );
        return res == -1 ? 0 : res;
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
              const res = this.project.connect(
                this.deviceA.id,
                this.idxA!,
                this.deviceB.id,
                firstEmptyInterface(this.deviceB),
              );
              if (res) console.log(res);
              this.updateProject();
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
      }
    },
    svgElements() {
      if (this.deviceA && this.idxA !== undefined && this.cursorPos) {
        const interfaceType =
          this.deviceA.internalState.netInterfaces[this.idxA].type;
        return (
          <line
            x1={this.deviceA.pos.x}
            y1={this.deviceA.pos.y}
            x2={this.cursorPos.x}
            y2={this.cursorPos.y}
            stroke={intfColor[interfaceType]}
          />
        );
      }
      return <></>;
    },
  };
}

function Btn({
  onClick,
  className: extraClass,
  children,
}: {
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      className={"h-8 w-24 px-3 rounded-md font-bold " + extraClass}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function InterfaceSelector({
  device,
  intfIdx,
  connectTool,
}: {
  device: Device;
  intfIdx?: number;
  connectTool: Pick<ConnectTool, "project" | "updateProject">;
}) {
  const isConnected = (i: number) =>
    connectTool.project.getConnectedTo(toInterfaceId(device.id, i)) !==
    undefined;
  return (
    <div className="p-[10px] w-[50%] text-black">
      <textarea
        className="resize-none rounded-md bg-white h-6 w-full mb-[10px]"
        value={device.name}
      ></textarea>

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
            <Btn onClick={() => {}} className="text-red-900 bg-red-400">
              Selezionata
            </Btn>
          ) : isConnected(i) ? (
            <Btn onClick={() => {}} className="text-red-900 bg-red-400">
              Scollega
            </Btn>
          ) : (
            <Btn onClick={() => {}} className="text-slate-900 bg-slate-400">
              Seleziona
            </Btn>
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
