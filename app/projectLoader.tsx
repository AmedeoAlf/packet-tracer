import { isRecord, SimpleRecord, throwString } from "./common";
import { jsonReplacer } from "./Project";
export const currVersion = "v1";

export function save(exported: SimpleRecord) {
  localStorage.setItem(
    "project:" + currVersion,
    JSON.stringify(exported, jsonReplacer),
  );
}

export function load() {
  let version = currVersion;
  let saved = localStorage.getItem("project:" + version);
  if (saved == null) {
    for (const v of Object.keys(converters)) {
      saved = localStorage.getItem("project:" + v);
      if (saved != null) {
        version = v;
        break;
      }
    }
    if (saved == null) {
      saved = localStorage.getItem("project");
      version = "devicesAsObj";
    }
  }
  if (saved == null) return;
  const json = JSON.parse(saved);
  if (!isRecord(json)) return;

  while (version != currVersion) {
    if (!(version in converters)) return;
    version = converters[version](json);
  }

  return json;
}

const converters: Record<string, (parsed: SimpleRecord) => string> = {
  devicesAsObj: (v) => {
    const devices = v.devices;
    if (devices && typeof devices == "object" && !Array.isArray(devices)) {
      v.devices = Object.values(devices) as unknown[];
    }
    return "v0";
  },
  v0: (v) => {
    if (!v.decals) return "v1";
    if (!Array.isArray(v.decals))
      throwString(`decals is not an array, but ${JSON.stringify(v.decals)}`);
    for (const it of v.decals) {
      if (it == null || it.type != "rect") continue;
      it.size = [it.size.width || 0, it.size.height || 0];
    }
    return "v1";
  },
};
