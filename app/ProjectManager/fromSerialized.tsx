import { isRecord, SimpleRecord, trustMeBroCast } from "../common";
import { Device } from "../devices/Device";
import { DeviceType, deviceTypesDB } from "../devices/deviceTypesDB";
import { ProjectManager } from "./ProjectManager";
import SimulationManager from "./SimulationManager";

export default function fromSerialized(
  serialized: Record<string, unknown>,
  tickRef: SimulationManager["_tickRef"],
) {
  const pm = ProjectManager.make(tickRef);
  function setIfPresent<P extends keyof typeof pm._project>(
    prop: P,
    transform: (t: unknown) => (typeof pm._project)[P] | undefined,
  ) {
    if (prop in serialized)
      pm._project[prop] = transform(serialized[prop]) ?? pm._project[prop];
  }
  pm._project = {
    ...pm._project,
    ...serialized,
  };
  setIfPresent("devices", (d) => {
    if (!Array.isArray(d)) return;

    type Validated = {
      type: DeviceType;
      id: number;
      internalState: SimpleRecord;
    };
    const mustHaveProps = [
      ["type", "string"],
      ["id", "number"],
      ["internalState", "object"],
    ] as const satisfies [keyof Validated, string][];
    return new Map(
      d
        .filter(
          (dev) =>
            isRecord(dev) &&
            mustHaveProps.every(
              ([prop, type]) => prop in dev && typeof dev[prop] == type,
            ) &&
            (dev as Validated).type in deviceTypesDB,
        )
        .map((parsed) => {
          trustMeBroCast<Validated>(parsed);
          const { type, id, ...props } = parsed;
          const factory = deviceTypesDB[type];
          const dev: Device = Object.create(factory.proto, {
            id: { value: +id, enumerable: true, writable: false },
          });
          dev.name = "invalid name";
          dev.pos = [0, 0];
          Object.assign(dev, props);
          dev.internalState = factory.proto.deserializeState?.(
            props.internalState,
          ) ?? {
            ...factory.defaultState(),
            ...props.internalState,
          };

          return [dev.id, dev];
        }),
    );
  });
  setIfPresent("connections", (d) => {
    if (typeof d !== "object" || d == null) return;
    return new Map(
      Object.entries(d).map(([from, to]) => [+from, to as number]),
    );
  });
  pm.sim.begin();
  for (const d of pm.devices.asImmutable.values()) {
    const initFn = d.emulator.init;
    if (initFn) {
      pm.sim.setTimeout(initFn, d.id, 1);
    }
  }
  return pm;
}
