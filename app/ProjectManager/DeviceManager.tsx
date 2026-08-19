import { capitalize, Coords, deepCopy, filterObject } from "../common";
import { Device, makeDevice } from "../devices/Device";
import { DeviceType, deviceTypesDB } from "../devices/deviceTypesDB";
import { AnyEmulatorContext } from "../emulators/DeviceEmulator";
import { Project } from "../Project";
import { ProjectManager } from "./ProjectManager";

export default class DeviceManager {
  constructor(private pm: ProjectManager) {}

  create(type: DeviceType, pos: Coords, name?: string) {
    const pm = this.pm;
    pm.mutatedDevices ??= [];

    ++pm._project.lastId;
    pm._project.devices.set(
      pm._project.lastId,
      makeDevice(
        deviceTypesDB[type],
        pm._project.lastId,
        pos,
        name ?? `${capitalize(type)} ${pm._project.lastId}`,
      ),
    );
    const initFn = deviceTypesDB[type].proto.emulator.init as (
      ctx: AnyEmulatorContext,
    ) => void | undefined;
    if (initFn) {
      const id = pm._project.lastId;
      pm.beginSimulation();
      pm.setTimeout(initFn, id, 1);
    }
    return pm._project.lastId;
  }

  duplicate(id: number): number | undefined {
    const pm = this.pm;
    const old = pm._project.devices.get(id);
    if (old === undefined) return;

    const newId = this.create(old.deviceType, [...old.pos], old.name);
    if (newId === undefined) return;

    const dup = pm._project.devices.get(newId)!;
    // FIXME: ho poca fiducia in una deep copy dell'internalState
    // Però adesso ho anche poca fiducia nelle performance
    dup.internalState = deepCopy(removeTempFields(old.internalState));
    return newId;
  }

  delete(id: number) {
    const pm = this.pm;
    const dev = pm._project.devices.get(id);
    if (dev === undefined) return;
    dev.internalState.netInterfaces.forEach((_, idx) => pm.disconnect(id, idx));
    pm._project.devices.delete(id);
    pm.mutatedDevices ??= [];
  }

  mutate(id: number): Device | undefined {
    const pm = this.pm;
    if (!pm._project.devices.has(id)) return;

    pm.mutatedDevices ??= [];

    if (!pm.mutatedDevices.includes(id)) {
      pm._project.devices.set(id, cloneDevice(pm._project.devices.get(id)!));
      pm.mutatedDevices.push(id);
    }
    return pm._project.devices.get(id);
  }

  get asImmutable(): Project["devices"] {
    return this.pm._project.devices;
  }

  fromTag(tag: HTMLOrSVGElement): Device | undefined {
    if (tag.dataset.id) {
      return this.asImmutable.get(+tag.dataset.id);
    }
  }
}

function removeTempFields<T extends object>(obj: T): T {
  return filterObject(obj, ([k]) => !k.endsWith("_t")) as T;
}

const cloneDevice = (d: Device): Device =>
  Object.setPrototypeOf({ ...d, pos: [...d.pos] }, Object.getPrototypeOf(d));
