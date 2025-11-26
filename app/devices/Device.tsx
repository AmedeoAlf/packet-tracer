"use client";
import { Coords } from "../common";
import { DeviceEmulator, InternalState } from "../emulators/DeviceEmulator";
import { DeviceType, deviceTypesDB } from "./deviceTypesDB";
import { ICONS } from "./ICONS";

/*
 * Un `DeviceFactory` è un oggetto che contiene i tratti distintivi di uno
 * specifico tipo di dispositivo (router/switch/etc).
 *
 * La sua proprietà più importante è il `deviceType`, con cui viene indicizzato
 * all'interno di `deviceTypesDb`; è quindi opportuno aggiungere prima il
 * `deviceType` lì dentro e poi creare la Factory
 */
export interface DeviceFactory<State extends InternalState<object>> {
  deviceType: DeviceType;
  iconId: keyof typeof ICONS;
  emulator: DeviceEmulator<State>;
  defaultState: () => State
}

/*
 * Un `Device` è un qualsiasi dispositivo presente (creato) all'interno del
 * progetto. Tutti i dispositivi sono omogenei eccetto che per il loro
 * `internalState` (dettato da `deviceType`)
 *
 * L'idea originale era avere `internalState` come la rappresentazione della
 * configurazione dell'apparato; all'alto pratico le interfacce di rete sono
 * praticamente un dato fisico, quindi non è una rappresentazione perfetta.
 */
export class Device {
  readonly id: number;
  readonly deviceType: DeviceType;
  name: string;
  pos: Coords;
  internalState: InternalState<object>;
  constructor(factory: typeof deviceTypesDB[keyof typeof deviceTypesDB], id: number, pos: Coords, name: string) {
    this.id = id;
    this.pos = pos;
    this.name = name;
    this.deviceType = factory.deviceType;
    this.internalState = factory.defaultState();
  }
}

export function deviceChanged(old: Device, curr: Device): boolean {
  const changed = (p: keyof Device) => old[p] != curr[p]
  switch (true) {
    case changed("name"): return true;
    case changed("deviceType"): return true;
    case old.pos.x != curr.pos.x: return true;
    case old.pos.y != curr.pos.y: return true;
    default: return false;
  }
}
