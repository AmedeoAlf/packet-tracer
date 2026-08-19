import { toInterfaceId } from "../Project";
import { ProjectManager } from "./ProjectManager";

export default function newInstance(this: ProjectManager) {
  const newProj = { ...this._project };
  if (this.mutatedDevices) newProj.devices = new Map(this._project.devices);
  if (this.mutatedDecals) newProj.decals = [...this._project.decals];
  if (
    !this.cableCache ||
    (this.mutatedDevices &&
      this.mutatedDevices.length != 0 &&
      this.mutatedDevices.some((dev) =>
        this.devices.asImmutable
          .get(dev)!
          .internalState.netInterfaces.some((_, idx) =>
            this._project.connections.has(toInterfaceId(dev, idx)),
          ),
      ))
  ) {
    newProj.connections = new Map(this._project.connections);
    this.computeCables();
  }

  const next = new ProjectManager(newProj, this._tickRef);
  next.packetLog = this.packetLog;
  next._emulatorTick = this._emulatorTick;

  next.cableCache = this.cableCache;

  next._callbacks = [...this._callbacks];

  this.applyMutations();
  return next;
}
