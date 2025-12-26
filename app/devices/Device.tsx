"use client";
import { Coords } from "../common";
import { DeviceEmulator, InternalState } from "../emulators/DeviceEmulator";
import { DeviceType } from "./deviceTypesDB";
import { ICONS } from "./ICONS";

/*
 * Un `DeviceFactory` è il parametro da passare a `makeDevice` che descrive il
 * tipo di dispositivo (router/switch/etc).
 *
 * Definisce dentro `proto` il prototipo utilizzato da ogni oggetto device e
 * utilizza `defaultState()` per generare l'internalState iniziale.
 *
 * Il prototipo contiene anche il deviceType (necessario a serializzare il
 * prototipo), l'id del tag <g> con la sua icona e l'emulatore del dispositivo
 * virtuale usato.
 */
export interface DeviceFactory<State extends InternalState<object>> {
  proto: {
    deviceType: DeviceType;
    iconId: keyof typeof ICONS;
    emulator: DeviceEmulator<State>;
    serializeState?: () => object;
  };
  defaultState: () => State;
}

/*
 * Un `Device` è un qualsiasi dispositivo presente (creato) all'interno del
 * progetto. Tutti i dispositivi sono omogenei eccetto che per il loro
 * `internalState` (dettato da `deviceType`).
 *
 * L'idea originale era avere `internalState` come la rappresentazione della
 * configurazione dell'apparato; ma in realtà comprende lo stato del sistema
 * operativo e lo stato delle interfacce.
 */
export type Device = DeviceFactory<any>["proto"] & {
  readonly id: number;
  name: string;
  pos: Coords;
  internalState: InternalState<object>;
};

export function makeDevice(
  factory: DeviceFactory<any>,
  id: number,
  pos: Coords,
  name: string,
) {
  return Object.setPrototypeOf(
    {
      internalState: factory.defaultState(),
      id,
      pos,
      name,
    } satisfies Omit<Device, keyof DeviceFactory<any>["proto"]>,
    factory.proto,
  );
}
