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
