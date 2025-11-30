"use client";
import { Coords } from "../common";
import { DeviceEmulator, InternalState } from "../emulators/DeviceEmulator";
import { DeviceType } from "./deviceTypesDB";
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
  proto: {
    deviceType: DeviceType;
    iconId: keyof typeof ICONS;
    emulator: DeviceEmulator<State>;
  }
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
export type Device = DeviceFactory<any>['proto'] & {
  readonly id: number;
  name: string;
  pos: Coords;
  internalState: InternalState<object>;
}

export function makeDevice(factory: DeviceFactory<any>, id: number, pos: Coords, name: string) {
  return Object.setPrototypeOf(
    {
      internalState: factory.defaultState(),
      id,
      pos,
      name
    } satisfies Omit<Device, keyof DeviceFactory<any>['proto']>,
    factory.proto
  )
}
