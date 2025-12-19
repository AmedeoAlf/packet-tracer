import { Device } from "../devices/Device";
import { Tool, ToolCtx } from "./Tool";
import { Coords } from "../common";
import { intfColor } from "../editorComponents/Cables";
import { toInterfaceId } from "../ProjectManager";

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
      switch (true) {
        case !this.deviceA:
          return <>Seleziona un dispositivo</>;
        case this.idxA === undefined:
          return <>Seleziona un interfaccia (TODO)</>;
        case !this.deviceB:
          return <>Seleziona il secondo dispositivo</>;
        default:
          return <div className="flex flex-wrap indent-0">

                  <div className="p-[10px] w-[50%]">
                  <textarea className="resize-none rounded-md bg-white h-6 w-full mb-[10px]"></textarea>

                    <div className="flex items-center justify-between">
                      <div className="bg-white h-6 w-17 rounded-md"></div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer"></input>
                        <div className="w-16 h-8 bg-red-500 rounded-full peer-checked:bg-green-500"></div>
                        <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition peer-checked:translate-x-8"></div>
                      </label>
                    </div>

                    <div className="flex justify-center items-center gap-6 pt-6">
                      <span className="text-white text-2xl cursor-pointer">&lt;</span>
                      <div className="bg-white rounded-md w-10 h-6"></div>
                      <span className="text-white text-2xl cursor-pointer">&gt;</span>
                    </div>
                  </div>

                  <div className="p-[10px] w-[50%]">
                  <textarea className="resize-none rounded-md bg-white h-6 w-full mb-[10px]"></textarea>

                    <div className="flex items-center justify-between">
                      <div className="bg-white h-6 w-17 rounded-md"></div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer"></input>
                        <div className="w-16 h-8 bg-red-500 rounded-full peer-checked:bg-green-500"></div>
                        <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition peer-checked:translate-x-8"></div>
                      </label>
                    </div>

                    <div className="flex justify-center items-center gap-6 pt-6">
                      <span className="text-white text-2xl cursor-pointer">&lt;</span>
                      <div className="bg-white rounded-md w-10 h-6"></div>
                      <span className="text-white text-2xl cursor-pointer">&gt;</span>
                    </div>
                  </div>
                  
                </div>;
      }
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
