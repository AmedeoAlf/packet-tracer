import { RefObject } from "react";
import {
  AnyEmulatorContext,
  buildEmulatorContext,
} from "../emulators/DeviceEmulator";
import { deviceOfIntf, idxOfIntf, InterfaceId } from "../Project";
import { ToolCtx } from "../tools/Tool";
import { Callback, ProjectManager } from "./ProjectManager";

export default class SimulationManager {
  _callbacks: Callback[] = [];

  // Il tick processato in questo momento
  _emulatorTick: number = -1;

  constructor(
    private pm: ProjectManager,
    // Il tick mostrato sul cronometro (per programmarne di nuovi)
    public _tickRef: RefObject<number>,
  ) {}

  setTimeout(
    fn: (t: AnyEmulatorContext) => void,
    device: number,
    delay: number,
  ): object {
    if (delay < 1) throw `setTimeout delay must be >0 (was ${delay})`;
    return this.scheduleCb((toolCtx) => {
      if (this.pm.devices.asImmutable.has(device))
        fn(
          buildEmulatorContext(
            this.pm.devices.asImmutable.get(device)!,
            toolCtx,
          ),
        );
    }, delay);
  }

  removeTimeout(timeout: object) {
    const idx = this._callbacks.indexOf(timeout as Callback);
    if (idx == -1) return;
    this._callbacks.splice(idx, 1);
  }

  sendOn(intf: InterfaceId, data: Buffer, toSelf = false) {
    const target = toSelf ? intf : this.pm.conn.getConnectedTo(intf);
    if (typeof target == "undefined") return;
    const dev = this.pm.devices.asImmutable.get(deviceOfIntf(target));
    if (!dev) return;
    const ifIdx = idxOfIntf(target);
    console.assert(dev.internalState.netInterfaces.length > ifIdx);

    this.pm.packetLog = [
      ...this.pm.packetLog,
      {
        bytes: data,
        from: intf,
        to: target,
        tick: this.currTick,
      },
    ];

    this.scheduleCb(
      (toolCtx: ToolCtx) =>
        dev.emulator.packetHandler(
          buildEmulatorContext(dev, toolCtx),
          data,
          ifIdx,
        ),
      toSelf ? 0 : 1,
    );
  }

  run(toolCtx: ToolCtx) {
    const now = this._tickRef.current;
    while (true) {
      const newTick = this.nextCallback();
      if (typeof newTick == "undefined" || newTick > now) break;
      this._emulatorTick = newTick;
      this.processTick(toolCtx);
    }
    this.end();
  }

  areTicksPending() {
    return this._callbacks.length != 0;
  }

  // Can be called multiple times without problems
  begin() {
    this._emulatorTick = this.currTick;
  }
  // A bit more dangerous
  end() {
    this._emulatorTick = -1;
  }

  get currTick() {
    return this._emulatorTick != -1
      ? this._emulatorTick
      : this._tickRef.current;
  }

  private scheduleCb(fn: (ctx: ToolCtx) => void, delay: number): object {
    this._callbacks.push({
      fn,
      onTick: this.currTick + delay,
    });
    return this._callbacks.at(-1)!;
  }

  private nextCallback() {
    if (this._callbacks.length == 0) return;

    const nextCallback = this._callbacks.reduce(
      (acc, val) => Math.min(acc, val.onTick),
      Infinity,
    );
    // // could implement checks to prevent ticks from the past...
    // if (nextCallback <= this.currTick)
    //   throw `There are callbacks in the past, currTick=${this.currTick}, callbacks=${this.callbacks.map((it) => it.onTick).join()}`;
    return nextCallback;
  }

  private processTick(toolCtx: ToolCtx) {
    const toClear: Callback[] = [];
    for (const cb of this._callbacks.values()) {
      if (cb.onTick != this.currTick) continue;
      try {
        cb.fn(toolCtx);
      } catch (e) {
        console.log("A callback shouldn't throw errors, but it threw");
        console.log(e);
      }
      toClear.push(cb);
    }
    if (toClear.length == 0) return;
    this._callbacks = this._callbacks.filter((cb) => !toClear.includes(cb));
    // NOTE: 100% not sure this is safe to comment
    // likely have to rewrite all packetHandlers
    //
    // toolCtx.updateProject();
  }
}
