import { Tool } from "./Tool";
import { DeviceType, deviceTypesDB } from "../devices/deviceTypesDB";
import { capitalize, Coords, trustMeBroCast } from "../common";
import { MouseEventHandler, ReactNode } from "react";
import { ICONS } from "../devices/ICONS";
import { SelectableCard } from "../editorComponents/SelectableCard";

export type AddTool = Tool<{
  deviceType: keyof typeof deviceTypesDB;
  cursorPos: Coords;
}>;

export function makeAddTool(prev: AddTool | object = {}): AddTool {
  return {
    cursorPos: [0, 0],
    deviceType: Object.keys(deviceTypesDB)[0] as DeviceType,
    ...prev,
    toolname: "add",
    panel: (ctx) => {
      return (
        <div className="m-2">
          <div className="h-8 rounded-md font-bold px-2 p-1 bg-gray-700 text-gray-400">
            Usa shift+click per aggiungere rapidamente
          </div>
          <p className="mt-2">Dispositivo selezionato:</p>
          <div className="flex-wrap flex w-max max-w-full gap-1">
            {Object.keys(deviceTypesDB).map((it) => {
              trustMeBroCast<keyof typeof deviceTypesDB>(it);
              return (
                <DeviceTypeComponent
                  type={it}
                  isSelected={it == ctx.tool.deviceType}
                  onClick={(ev) => {
                    if (ev.shiftKey) {
                      ctx.project.createDevice(
                        deviceTypesDB[it].proto.deviceType,
                        [
                          (ctx.project.lastId % 5) * 100 - 600,
                          Math.floor(ctx.project.lastId / 5) * 100 - 350,
                        ],
                      );
                      ctx.updateProject();
                    }
                    ctx.tool.deviceType = it;
                    ctx.updateTool();
                  }}
                  key={it}
                  className="block-inline w-20 "
                />
              );
            })}
          </div>
        </div>
      );
    },
    onEvent: (ctx, ev) => {
      switch (ev.type) {
        case "click":
          ctx.project.createDevice(ctx.tool.deviceType, ev.pos);
          ctx.updateProject();
          break;
        case "mousemove":
          ctx.tool.cursorPos = ev.pos;
          ctx.updateTool();
          break;
      }
    },
    svgElements: (ctx) => {
      return (
        <use
          href={deviceTypesDB[ctx.tool.deviceType].proto.iconId}
          className="opacity-50"
          x={ctx.tool.cursorPos[0]}
          y={ctx.tool.cursorPos[1]}
        />
      );
    },
  };
}

function DeviceTypeComponent({
  type,
  isSelected,
  onClick,
  className,
}: {
  type: keyof typeof deviceTypesDB;
  isSelected: boolean;
  onClick: MouseEventHandler;
  className?: string;
}): ReactNode {
  return (
    <SelectableCard
      onClick={onClick}
      className={className}
      isSelected={isSelected}
    >
      <svg viewBox="-35 -30 70 60" className="w-full">
        {ICONS[deviceTypesDB[type].proto.iconId]}
      </svg>
      <p className="text-center truncate w-full">{capitalize(type)}</p>
    </SelectableCard>
  );
}
