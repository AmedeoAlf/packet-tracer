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
  let node = filesystem;
  for (const f of folders) {
    if (typeof node != 'object') node = {};
    node = node[f];
  }
  if (typeof node != 'object') node = {};
  node[filename] = content;
}

export function listAll(filesystem: OSInternalState['filesystem']): string[] {
  return Object.keys(filesystem).flatMap((file) => {
    if (!isDirectory(file)) return file;
    return listAll(file);
  })
}