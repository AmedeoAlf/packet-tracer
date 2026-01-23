import {
  defaultL3InternalState,
  L3InternalState,
} from "@/app/protocols/rfc_760";
import { randomMAC } from "../../protocols/802_3";
import { DeviceFactory } from "../Device";
import {
  computerEmulator,
  OSUDPPacket,
} from "@/app/emulators/list/computerEmulator";
import { EmulatorContext } from "@/app/emulators/DeviceEmulator";

enum OSError {
  NoErr,
  FileNotFound,
  IsDirectory,
}

function isError(value: OSFile | OSError): value is OSError {
  return typeof value == "number";
}

function isDirectory(value: OSFile | OSDir): value is OSDir {
  return typeof value == "object";
}

type OSFile = string | OSDir;

type OSDir = { [k: string]: OSFile };

export function getDir(
  filesystem: OSInternalState["filesystem"],
  file: string,
): OSDir | OSError {
  const folders = file.split("/");
  let curr = filesystem;
  for (const f of folders) {
    if (!isDirectory(curr)) return OSError.FileNotFound;
    curr = curr[f];
  }
  if (!isDirectory(curr)) return OSError.FileNotFound;
  return curr;
}

export function readFile(
  filesystem: OSInternalState["filesystem"],
  file: string,
): string | OSError {
  const folders = file.split("/");
  const filename = folders.pop()!;
  const folder = getDir(filesystem, folders.join("/"));
  if (isError(folder)) return folder;
  if (!(filename in folder)) return OSError.FileNotFound;
  if (isDirectory(folder[filename])) return OSError.IsDirectory;
  return folder[filename];
}

export function writeFile(
  filesystem: OSInternalState["filesystem"],
  file: string,
  content: string,
): OSError {
  const folders = file.split("/");
  const filename = folders.pop()!;
  const folder = getDir(filesystem, folders.join("/"));
  if (isError(folder)) return folder;
  folder[filename] = content;
  return OSError.NoErr;
}

export type OSInternalState = L3InternalState<{
  filesystem: OSFile;
  udpSockets: Map<
    number,
    (ctx: EmulatorContext<OSInternalState>, p: OSUDPPacket) => void
  >;
}>;

export const Computer: DeviceFactory<OSInternalState> = {
  proto: {
    iconId: "#pc-icon",
    emulator: computerEmulator,
    deviceType: "computer",
  },

  // Default State Switch da Cambiare
  defaultState() {
    return {
      ...defaultL3InternalState(),
      netInterfaces: [
        { name: "if0", maxMbps: 100, type: "copper", mac: randomMAC() },
      ],
      filesystem: {},
      udpSockets: new Map(),
    };
  },
};
