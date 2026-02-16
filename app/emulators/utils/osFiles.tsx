import { OSInternalState } from "@/app/devices/list/Computer";

export enum OSError {
  NoErr,
  FileNotFound,
  IsDirectory,
}

export function isError(value: OSFile | OSError): value is OSError {
  return typeof value == "number";
}

export function isDirectory(value: OSFile | OSDir): value is OSDir {
  return typeof value == "object";
}

export type OSFile = string | OSDir;

export type OSDir = { [k: string]: OSFile };

export function getDir(
  filesystem: OSInternalState["filesystem"],
  file: string,
): OSDir | OSError {
  const folders = file.split("/");
  let curr = filesystem;
  for (const f of folders.filter((it) => it)) {
    if (!isDirectory(curr[f])) return OSError.FileNotFound;
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

export function readSettingsFile(
  filesystem: OSInternalState["filesystem"],
  file: string,
): Record<string, any> | undefined {
  const f = readFile(filesystem, file);
  if (isError(f)) return;
  return JSON.parse(f);
}

export function writeFile(
  filesystem: OSInternalState["filesystem"],
  path: string,
  content: string,
): OSError {
  const folders = path.split("/");
  const filename = folders.pop()!;
  const folder = getDir(filesystem, folders.join("/"));
  if (isError(folder)) return folder;
  folder[filename] = content;
  return OSError.NoErr;
}

export function writeFileInLocation(
  filesystem: OSInternalState["filesystem"],
  path: string,
  content: string,
) {
  const folders = path.split("/");
  const filename = folders.pop()!;
  console.log("write in: folders", folders, "file", filename);
  let node = filesystem as OSDir;
  for (const f of folders.filter((it) => it)) {
    if (typeof node[f] != "object") node[f] = {};
    node = node[f];
  }
  node[filename] = content;
}

export function listAll(filesystem: OSDir, prefix = "/"): string[] {
  return Object.keys(filesystem).flatMap((file) => {
    if (!isDirectory(filesystem[file])) return prefix + file;
    return listAll(filesystem[file], prefix + file + "/");
  });
}
