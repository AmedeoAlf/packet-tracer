import {
  NetworkInterface,
  PhysicalInterfaceType,
} from "../emulators/DeviceEmulator";
import {
  deviceOfIntf,
  idxOfIntf,
  InterfaceId,
  ProjectManager,
  toInterfaceId,
} from "../Project";

export function getInterface(
  this: ProjectManager,
  devId: number,
  ifId: number,
): NetworkInterface | undefined {
  return this._project.devices.get(devId)?.internalState.netInterfaces.at(ifId);
}

export function getInterfaceFromId(
  this: ProjectManager,
  intf: InterfaceId,
): NetworkInterface | undefined {
  return this.getInterface(deviceOfIntf(intf), idxOfIntf(intf));
}

export function connect(
  this: ProjectManager,
  devIdA: number,
  ifIdA: number,
  devIdB: number,
  ifIdB: number,
) {
  {
    const a = this.getInterface(devIdA, ifIdA);
    const b = this.getInterface(devIdB, ifIdB);
    if (!a || !b) return "Interfacce non trovate";
    if (a.type == "localhost")
      return "Impossibile collegare interfacce virtuali (type: 'localhost')";
    if (a.type != b.type) return "Interfacce non compatibili";
  }
  const intfA = toInterfaceId(devIdA, ifIdA);
  const intfB = toInterfaceId(devIdB, ifIdB);
  this._project.connections.delete(this._project.connections.get(intfA) || -1);
  this._project.connections.delete(this._project.connections.get(intfB) || -1);
  this._project.connections.set(intfA, intfB);
  this._project.connections.set(intfB, intfA);
  this.cableCache = undefined;
  return;
}

export function disconnect(this: ProjectManager, devId: number, ifId: number) {
  const intf = toInterfaceId(devId, ifId);
  if (!this._project.connections.has(intf)) return;
  this._project.connections.delete(this._project.connections.get(intf)!);
  this._project.connections.delete(intf);
  this.cableCache = undefined;
}

export function getCables(
  this: ProjectManager,
): NonNullable<typeof this.cableCache> {
  if (!this.cableCache) {
    this.computeCables();
    console.log(
      "cables were not computed properly, computeCables() should've been called in newInstance()",
    );
  }
  return this.cableCache!;
}

// Maps two deviceIds to the amount of connections between them
export function computeCables(this: ProjectManager) {
  const cabled = new Set<number>();
  this.cableCache = new Map();
  for (const conn of this._project.connections) {
    if (cabled.has(conn[0])) continue;
    cabled.add(conn[1]);

    const reversed = deviceOfIntf(conn[0]) > deviceOfIntf(conn[1]);
    if (reversed) conn.reverse();
    const key = [deviceOfIntf(conn[0]), deviceOfIntf(conn[1])].reduce(
      (acc, val) => (acc << 16) | val,
    );
    if (!this.cableCache.has(key)) this.cableCache.set(key, []);

    const ifA = this.getInterfaceFromId(conn[0])!;
    const ifB = this.getInterfaceFromId(conn[1])!;
    this.cableCache.get(key)!.push({
      type: ifA.type as PhysicalInterfaceType,
      maxMbps: Math.min(
        ifA.maxMbps,
        ifB.maxMbps,
      ) as NetworkInterface["maxMbps"],
      intf: conn.map((it) => idxOfIntf(it)) as [number, number],
    });
  }
}

export function getConnectedTo(
  this: ProjectManager,
  intf: InterfaceId,
): InterfaceId | undefined {
  if (this.getInterfaceFromId(intf)?.type == "localhost") return intf;
  return this._project.connections.get(intf);
}

export function getAllConnections(
  this: ProjectManager,
): IteratorObject<[InterfaceId, InterfaceId]> {
  return this._project.connections.entries();
}
