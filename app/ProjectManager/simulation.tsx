import {
  AnyEmulatorContext,
  buildEmulatorContext,
} from "../emulators/DeviceEmulator";
import { deviceOfIntf, idxOfIntf, InterfaceId } from "../Project";
import { ToolCtx } from "../tools/Tool";
import { Callback, ProjectManager } from "./ProjectManager";

function scheduleCb(
  self: ProjectManager,
  fn: (ctx: ToolCtx) => void,
  delay: number,
): object {
  self._callbacks.push({
    fn,
    onTick: self.currTick + delay,
  });
  return self._callbacks.at(-1)!;
}

export function setEmulatorTimeout(
  this: ProjectManager,
  fn: (t: AnyEmulatorContext) => void,
  device: number,
  delay: number,
): object {
  if (delay < 1) throw `setTimeout delay must be >0 (was ${delay})`;
  return scheduleCb(
    this,
    (toolCtx) => {
      if (this.devices.asImmutable.has(device))
        fn(
          buildEmulatorContext(this.devices.asImmutable.get(device)!, toolCtx),
        );
    },
    delay,
  );
}

export function removeTimeout(this: ProjectManager, timeout: object) {
  const idx = this._callbacks.indexOf(timeout as Callback);
  if (idx == -1) return;
  this._callbacks.splice(idx, 1);
}
export function sendOn(
  this: ProjectManager,
  intf: InterfaceId,
  data: Buffer,
  toSelf = false,
) {
  const target = toSelf ? intf : this.conn.getConnectedTo(intf);
  if (typeof target == "undefined") return;
  const dev = this._project.devices.get(deviceOfIntf(target));
  if (!dev) return;
  const ifIdx = idxOfIntf(target);
  console.assert(dev.internalState.netInterfaces.length > ifIdx);

  this.packetLog = [
    ...this.packetLog,
    {
      bytes: data,
      from: intf,
      to: target,
      tick: this.currTick,
    },
  ];

  scheduleCb(
    this,
    (toolCtx: ToolCtx) =>
      dev.emulator.packetHandler(
        buildEmulatorContext(dev, toolCtx),
        data,
        ifIdx,
      ),
    toSelf ? 0 : 1,
  );
}

export function runSimulation(this: ProjectManager, toolCtx: ToolCtx) {
  const now = this._tickRef.current;
  while (true) {
    const newTick = nextCallback(this);
    if (typeof newTick == "undefined" || newTick > now) break;
    this._emulatorTick = newTick;
    processTick(this, toolCtx);
  }
  this.endSimulation();
}

function nextCallback(self: ProjectManager) {
  if (self._callbacks.length == 0) return;

  const nextCallback = self._callbacks.reduce(
    (acc, val) => Math.min(acc, val.onTick),
    Infinity,
  );
  // // could implement checks to prevent ticks from the past...
  // if (nextCallback <= this.currTick)
  //   throw `There are callbacks in the past, currTick=${this.currTick}, callbacks=${this.callbacks.map((it) => it.onTick).join()}`;
  return nextCallback;
}

function processTick(self: ProjectManager, toolCtx: ToolCtx) {
  const toClear: Callback[] = [];
  for (const cb of self._callbacks.values()) {
    if (cb.onTick != self.currTick) continue;
    try {
      cb.fn(toolCtx);
    } catch (e) {
      console.log("A callback shouldn't throw errors, but it threw");
      console.log(e);
    }
    toClear.push(cb);
  }
  if (toClear.length == 0) return;
  self._callbacks = self._callbacks.filter((cb) => !toClear.includes(cb));
  // NOTE: 100% not sure this is safe to comment
  // likely have to rewrite all packetHandlers
  //
  // toolCtx.updateProject();
}
