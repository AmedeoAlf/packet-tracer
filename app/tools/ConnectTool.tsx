import { Device } from "../devices/Device";
import { Tool, ToolCtx } from "./Tool";
import { Coords } from "../common";
import { intfColor } from "../editorComponents/Cables";
import { toInterfaceId } from "../ProjectManager";
import { NetworkInterface } from "../emulators/DeviceEmulator";
import { Button } from "../editorComponents/RoundBtn";
import { memo } from "react";

export type ConnectTool = Tool<{
  deviceA?: Device;
  idxA?: number;
  deviceB?: Device;
  idxB?: number;
  errorMsg?: string;
  cursorPos?: Coords;
}>;

function clearSelection({ tool, updateTool }: ToolCtx<ConnectTool>) {
  tool.deviceA = undefined;
  tool.idxA = undefined;
  tool.deviceB = undefined;
  tool.idxB = undefined;
  tool.errorMsg = undefined;
  updateTool();
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

function connect(c: ToolCtx<ConnectTool>) {
  if (!canConnect(c.tool))
    throw "ArgumentException: can't access ConnectTool.idxA/.idxB";
  c.project.connect(
    c.tool.deviceA!.id,
    c.tool.idxA!,
    c.tool.deviceB!.id,
    c.tool.idxB!,
  );
  clearSelection(c);
  c.updateProject();
}
function intfType(dev: Device, intf: number) {
  return dev.internalState.netInterfaces[intf].type;
}

export function makeConnectTool(prev: ConnectTool | object = {}): ConnectTool {
  return {
    deviceA: undefined,
    idxA: undefined,
    deviceB: undefined,
    idxB: undefined,
    errorMsg: undefined,
    ...prev,
    toolname: "connect",
    panel: (ctx) => {
      return (
        <>
          <div className="p-2">
            <ConnectBtn connectTool={ctx} />
          </div>
          <div className="flex flex-wrap indent-0">
            {!ctx.tool.deviceA ? (
              <>Seleziona il primo dispositivo</>
            ) : (
              <>
                <InterfaceSelector
                  device={ctx.tool.deviceA}
                  selectIntf={(n) => {
                    ctx.tool.idxA = n;
                    ctx.updateTool();
                  }}
                  intfIdx={ctx.tool.idxA}
                  connectTool={ctx}
                />
                {!ctx.tool.deviceB ? (
                  <>Seleziona il secondo dispositivo</>
                ) : (
                  <InterfaceSelector
                    device={ctx.tool.deviceB}
                    connectTool={ctx}
                    intfIdx={ctx.tool.idxB}
                    selectIntf={(n) => {
                      ctx.tool.idxB = n;
                      ctx.updateTool();
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
    onEvent: (ctx, ev) => {
      const firstEmptyInterface = (
        device: Device,
        type?: NetworkInterface["type"],
      ): number => {
        let firstIf: number | undefined = undefined;
        const res = device.internalState.netInterfaces.findIndex((_, idx) => {
          if (
            ctx.project.getConnectedTo(toInterfaceId(device.id, idx)) ==
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
              clearSelection(ctx);
              return;
            case !ctx.tool.deviceA:
              ctx.tool.deviceA = ev.device;
              ctx.tool.idxA = firstEmptyInterface(ctx.tool.deviceA);
              ctx.tool.cursorPos = ev.pos;
              ctx.updateTool();
              return;
            case !ctx.tool.deviceB:
              ctx.tool.deviceB = ev.device;
              ctx.tool.idxB = firstEmptyInterface(ctx.tool.deviceB);
              ctx.updateTool();
              return;
          }
          break;
        case "mousemove":
          if (ctx.tool.deviceA) {
            ctx.tool.cursorPos = ev.pos;
            ctx.updateTool();
          }
          break;
        case "keydown":
          if (ev.key == "c" && canConnect(ctx.tool)) {
            connect(ctx);
            ev.consumed = true;
          }
      }
    },
    svgElements: ({ tool }) => {
      if (tool.deviceA && tool.idxA !== undefined) {
        if (tool.idxB !== undefined) {
          const typeA = intfType(tool.deviceA, tool.idxA);

          const lineColor =
            intfType(tool.deviceB!, tool.idxB) === typeA
              ? intfColor[intfType(tool.deviceA, tool.idxA)]
              : "red";
          return (
            <line
              x1={tool.deviceA.pos.x}
              y1={tool.deviceA.pos.y}
              x2={tool.deviceB!.pos.x}
              y2={tool.deviceB!.pos.y}
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
        } else if (tool.cursorPos) {
          return (
            <line
              x1={tool.deviceA.pos.x}
              y1={tool.deviceA.pos.y}
              x2={tool.cursorPos.x}
              y2={tool.cursorPos.y}
              stroke={intfColor[intfType(tool.deviceA, tool.idxA)]}
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
  connectTool: Pick<
    ToolCtx<ConnectTool>,
    "project" | "updateProject" | "updateTool"
  >;
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
              onClick={() => {
                selectIntf(i);
              }}
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

const ConnectBtn = memo(
  function ConnectBtn({ connectTool }: { connectTool: ToolCtx<ConnectTool> }) {
    return canConnect(connectTool.tool) ? (
      <Button
        onClick={() => connect(connectTool)}
        className="w-full p-0 bg-green-900 text-green-200 hover:bg-green-800 active:bg-green-700"
      >
        Collega [c]
      </Button>
    ) : (
      <Button className="w-full p-0 bg-gray-800 text-gray-500">
        Seleziona due interfacce compatibili
      </Button>
    );
  },
  (p, n) =>
    p.connectTool.tool.idxA === n.connectTool.tool.idxA &&
    p.connectTool.tool.idxB === n.connectTool.tool.idxB &&
    p.connectTool.tool.deviceA === n.connectTool.tool.deviceA &&
    p.connectTool.tool.deviceB === n.connectTool.tool.deviceB,
);
