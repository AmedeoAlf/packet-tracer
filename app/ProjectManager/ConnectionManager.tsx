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

export default class ConnectionManager {
  constructor(private pm: ProjectManager) {}

  cableCache?: Map<
    number,
    (Pick<NetworkInterface, "maxMbps"> & {
      intf: [number, number];
      type: PhysicalInterfaceType;
    })[]
  >;

  getInterface(devId: number, ifId: number): NetworkInterface | undefined {
    return this.pm._project.devices
      .get(devId)
      ?.internalState.netInterfaces.at(ifId);
  }

  getInterfaceFromId(intf: InterfaceId): NetworkInterface | undefined {
    return this.getInterface(deviceOfIntf(intf), idxOfIntf(intf));
  }

  connect(devIdA: number, ifIdA: number, devIdB: number, ifIdB: number) {
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

    const conn = this.pm._project.connections;
    conn.delete(conn.get(intfA) || -1);
    conn.delete(conn.get(intfB) || -1);
    conn.set(intfA, intfB);
    conn.set(intfB, intfA);
    this.cableCache = undefined;
    return;
  }

  disconnect(devId: number, ifId: number) {
    const intf = toInterfaceId(devId, ifId);
    const conn = this.pm._project.connections;
    if (!conn.has(intf)) return;
    conn.delete(conn.get(intf)!);
    conn.delete(intf);
    this.cableCache = undefined;
  }

  getComputed(): NonNullable<typeof this.cableCache> {
    if (!this.cableCache) {
      this.compute();
      console.log(
        "cables were not computed properly, computeCables() should've been called in newInstance()",
      );
    }
    return this.cableCache!;
  }

  // Maps two deviceIds to the amount of connections between them
  compute() {
    const cabled = new Set<number>();
    this.cableCache = new Map();
    for (const conn of this.pm._project.connections) {
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

  getConnectedTo(intf: InterfaceId): InterfaceId | undefined {
    if (this.getInterfaceFromId(intf)?.type == "localhost") return intf;
    return this.pm._project.connections.get(intf);
  }

  getAll(): IteratorObject<[InterfaceId, InterfaceId]> {
    return this.pm._project.connections.entries();
  }
}
