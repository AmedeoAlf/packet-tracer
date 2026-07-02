import { capitalize, Coords, deepCopy, filterObject } from "../common";
import { makeDevice } from "../devices/Device";
import { DeviceType, deviceTypesDB } from "../devices/deviceTypesDB";
import { AnyEmulatorContext } from "../emulators/DeviceEmulator";
import { ProjectManager } from "./ProjectManager";

export function createDevice(
  this: ProjectManager,
  type: DeviceType,
  pos: Coords,
  name?: string,
) {
  this.mutatedDevices ??= [];

  ++this._project.lastId;
  this._project.devices.set(
    this._project.lastId,
    makeDevice(
      deviceTypesDB[type],
      this._project.lastId,
      pos,
      name ?? `${capitalize(type)} ${this._project.lastId}`,
    ),
  );
  const initFn = deviceTypesDB[type].proto.emulator.init as (
    ctx: AnyEmulatorContext,
  ) => void | undefined;
  if (initFn) {
    const id = this._project.lastId;
    this.beginSimulation();
    this.setTimeout(initFn, id, 1);
  }
  return this._project.lastId;
}

export function duplicateDevice(
  this: ProjectManager,
  id: number,
): number | undefined {
  const old = this._project.devices.get(id);
  if (old === undefined) return;

  const newId = this.createDevice(old.deviceType, [...old.pos], old.name);
  if (newId === undefined) return;

  const dup = this._project.devices.get(newId)!;
  // FIXME: ho poca fiducia in una deep copy dell'internalState
  // Però adesso ho anche poca fiducia nelle performance
  dup.internalState = deepCopy(removeTempFields(old.internalState));
  return newId;
}

export function deleteDevice(this: ProjectManager, id: number) {
  const dev = this._project.devices.get(id);
  if (dev === undefined) return;
  dev.internalState.netInterfaces.forEach((_, idx) => this.disconnect(id, idx));
  this._project.devices.delete(id);
  this.mutatedDevices ??= [];
}

function removeTempFields<T extends object>(obj: T): T {
  return filterObject(obj, ([k]) => !k.endsWith("_t")) as T;
}
