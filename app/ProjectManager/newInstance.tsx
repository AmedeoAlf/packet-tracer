import { toInterfaceId } from "../Project";
import { ProjectManager } from "./ProjectManager";

export default function newInstance(this: ProjectManager) {
  const newProj = { ...this._project };
  if (this.devices._mutated) newProj.devices = new Map(this._project.devices);
  if (this.mutatedDecals) newProj.decals = [...this._project.decals];
  if (
    !this.conn.cableCache ||
    this.devices._mutated?.some((dev) =>
      this.devices.asImmutable
        .get(dev)!
        .internalState.netInterfaces.some((_, idx) =>
          this._project.connections.has(toInterfaceId(dev, idx)),
        ),
    )
  ) {
    newProj.connections = new Map(this._project.connections);
    this.conn.compute();
  }

  const next = new ProjectManager(newProj, this.sim._tickRef);
  next.packetLog = this.packetLog;
  next.sim._emulatorTick = this.sim._emulatorTick;

  next.conn.cableCache = this.conn.cableCache;

  next.sim._callbacks = [...this.sim._callbacks];

  return next;
}
