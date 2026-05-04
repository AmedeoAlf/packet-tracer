import { Device } from "../devices/Device";
import { Tool, ToolConstructor, ToolCtx } from "./Tool";
import { Coords } from "../common";
import { intfColor } from "../editorComponents/Cables";
import { ProjectManager, toInterfaceId } from "../ProjectManager";
import { NetworkInterface } from "../emulators/DeviceEmulator";
import { Button } from "../editorComponents/RoundBtn";
import { memo } from "react";
import { isSelectTool, SelectTool } from "./SelectTool";

export type ConnectTool = Tool<ConnectTool> & {
  deviceA?: Device;
  idxA?: number;
  deviceB?: Device;
  idxB?: number;
  errorMsg?: string;
  cursorPos?: Coords;
};

function clearSelection({ toolRef, updateTool }: ToolCtx<ConnectTool>) {
  toolRef.current.deviceA = undefined;
  toolRef.current.idxA = undefined;
  toolRef.current.deviceB = undefined;
  toolRef.current.idxB = undefined;
  toolRef.current.errorMsg = undefined;
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
  c.projectRef.current.connect(
    c.tool.deviceA!.id,
    c.tool.idxA!,
    c.tool.deviceB!.id,
    c.tool.idxB!,
  );
  clearSelection(c);
  c.updateProject();
  c.revertTool();
}

function intfType(dev: Device, intf: number) {
  return dev.internalState.netInterfaces[intf].type;
}

function migrateSelectedDevices(
  prev: SelectTool | ConnectTool | object,
  project: ProjectManager,
): Pick<ConnectTool, "deviceA" | "deviceB" | "idxA" | "idxB"> | undefined {
  if (!isSelectTool(prev)) return;
  if (prev.selected.size != 1 && prev.selected.size != 2) return;
  const devices = prev.selected
    .values()
    .take(2)
    .map((d) => project.immutableDevices.get(d)!)
    .toArray();
  return {
    deviceA: devices[0],
    idxA: firstEmptyInterface(project, devices[0]),
    deviceB: devices.at(1),
    idxB: devices.at(1) ? firstEmptyInterface(project, devices[1]) : undefined,
  };
}

export const makeConnectTool: ToolConstructor<ConnectTool> = (
  prev: ConnectTool | SelectTool | object = {},
  project: ProjectManager,
): ConnectTool => {
  const selectedDevices = migrateSelectedDevices(prev, project);
  return {
    ...prev,
    ...selectedDevices,
    toolname: "connect",
    panel: (ctx) => {
      return (
        <>
          <div className="p-2">
            <ConnectBtn connectTool={ctx} />
          </div>
          <div className="flex flex-wrap indent-0">
            {!ctx.tool.deviceA ? (
              <div className="h-8 rounded-md font-bold m-2 px-2 p-1 text-cardfg">
                Seleziona il primo dispositivo
              </div>
            ) : (
              <>
                <InterfaceSelector
                  device={ctx.tool.deviceA}
                  ctx={ctx}
                  intfIdx={ctx.tool.idxA}
                  selectIntf={(n) => {
                    ctx.toolRef.current.idxA = n;
                    ctx.updateTool();
                  }}
                />
                {!ctx.tool.deviceB ? (
                  <div className="h-8 rounded-md font-bold m-2 px-2 p-1 text-cardfg">
                    Seleziona il secondo dispositivo
                  </div>
                ) : (
                  <InterfaceSelector
                    device={ctx.tool.deviceB}
                    ctx={ctx}
                    intfIdx={ctx.tool.idxB}
                    selectIntf={(n) => {
                      ctx.toolRef.current.idxB = n;
                      ctx.updateTool();
                    }}
                  />
                )}
              </>
            )}
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
            case !ctx.toolRef.current.deviceA:
              ctx.toolRef.current.deviceA = ev.device;
              ctx.toolRef.current.idxA = firstEmptyInterface(
                ctx.toolRef.current.deviceA,
              );
              ctx.toolRef.current.cursorPos = ev.pos;
              ctx.updateTool();
              return;
            case !ctx.toolRef.current.deviceB:
              ctx.toolRef.current.deviceB = ev.device;
              ctx.toolRef.current.idxB = firstEmptyInterface(
                ctx.toolRef.current.deviceB,
              );
              ctx.updateTool();
              return;
          }
          break;
        case "mousemove":
          if (ctx.toolRef.current.deviceA) {
            ctx.toolRef.current.cursorPos = ev.pos;
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
              x1={tool.deviceA.pos[0]}
              y1={tool.deviceA.pos[1]}
              x2={tool.deviceB!.pos[0]}
              y2={tool.deviceB!.pos[1]}
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
              x1={tool.deviceA.pos[0]}
              y1={tool.deviceA.pos[1]}
              x2={tool.cursorPos[0]}
              y2={tool.cursorPos[1]}
              stroke={intfColor[intfType(tool.deviceA, tool.idxA)]}
            />
          );
        }
      }
      return <></>;
    },
  };
};

const InterfaceSelector = memo(
  function InterfaceSelector({
    intfIdx,
    device,
    selectIntf,
    ctx,
  }: {
    device: Device;
    intfIdx?: number;
    selectIntf: (idx: number) => void;
    ctx: Pick<
      ToolCtx<ConnectTool>,
      "project" | "projectRef" | "updateProject" | "updateTool"
    >;
  }) {
    const isConnected = (i: number) =>
      ctx.project.getConnectedTo(toInterfaceId(device.id, i)) !== undefined;
    return (
      <div className="p-2 w-1/2">
        <div className="rounded-md font-bold p-1 text-center w-full mb-1">
          {device.name}
        </div>

        {device.internalState.netInterfaces.map((intf, i) => (
          <div key={i} className="flex items-center justify-between m-1">
            <div className="w-17 rounded-md">{intf.name}</div>
            {i === intfIdx ? (
              <Button className="bg-selected">Selezionata</Button>
            ) : isConnected(i) ? (
              <Button
                onClick={() => {
                  ctx.projectRef.current.disconnect(device.id, i);
                  ctx.updateProject();
                  selectIntf(i);
                }}
                className="bg-bad hover:brightness-130 active:brightness-100"
              >
                Scollega
              </Button>
            ) : (
              <Button
                onClick={() => {
                  selectIntf(i);
                }}
                className="bg-selectable hover:brightness-110 active:brightness-120"
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
  },
  (p, n) => p.intfIdx === n.intfIdx && p.ctx.project == n.ctx.project,
);

const ConnectBtn = memo(
  function ConnectBtn({ connectTool }: { connectTool: ToolCtx<ConnectTool> }) {
    return canConnect(connectTool.tool) ? (
      <Button
        onClick={() => connect(connectTool)}
        className="w-full p-0 bg-primary hover:brightness-90 active:brightness-80"
      >
        Collega [c]
      </Button>
    ) : (
      <Button className="w-full p-0 bg-onsidebar text-cardfg">
        Seleziona due interfacce compatibili
      </Button>
    );
  },
  (p, n) => {
    // console.log(
    //   p.connectTool.tool.idxA,
    //   n.connectTool.tool.idxA,
    //   p.connectTool.tool.idxB,
    //   n.connectTool.tool.idxB,
    // );
    return (
      p.connectTool.tool.idxA === n.connectTool.tool.idxA &&
      p.connectTool.tool.idxB === n.connectTool.tool.idxB &&
      p.connectTool.tool.deviceA === n.connectTool.tool.deviceA &&
      p.connectTool.tool.deviceB === n.connectTool.tool.deviceB
    );
  },
);

const firstEmptyInterface = (
  project: ProjectManager,
  device: Device,
  type?: NetworkInterface["type"],
): number => {
  let firstIf: number | undefined = undefined;
  const res = device.internalState.netInterfaces.findIndex((_, idx) => {
    if (project.getConnectedTo(toInterfaceId(device.id, idx)) == undefined) {
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
