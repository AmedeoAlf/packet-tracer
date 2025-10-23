"use client";

import { Dispatch, SetStateAction } from "react";

export type Coords = { x: number; y: number; };
export type StateSetter<T> = Dispatch<SetStateAction<T>>;
