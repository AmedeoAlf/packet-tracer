import { arraySwap, deepCopy } from "../common";
import { Decal, DecalData, Project } from "../Project";
import { ProjectManager } from "./ProjectManager";

export default class DecalManager {
  _mutated?: number[];

  constructor(private pm: ProjectManager) {}

  get asImmutable(): Project["decals"] {
    return this.pm._project.decals;
  }

  mut(id: number): Decal | undefined {
    const dec = this.pm._project.decals.at(id);
    if (!dec) return;
    this._mutated ??= [];
    if (!this._mutated.includes(id)) {
      this.pm._project.decals[id] = deepCopy(dec);
      this._mutated.push(id);
    }
    return this.pm._project.decals.at(id) ?? undefined;
  }

  fromTag(tag: HTMLOrSVGElement): Decal | undefined {
    if (tag.dataset.decalid) {
      return this.pm._project.decals[+tag.dataset.decalid] ?? undefined;
    }
  }

  add(d: DecalData): number {
    this._mutated ??= [];
    this.pm._project.decals.push({ ...d, id: this.pm._project.decals.length });
    return this.pm._project.decals.length - 1;
  }

  duplicate(id: number): number | undefined {
    const old = this.pm._project.decals.at(id) ?? null;
    if (old === null) return;

    return this.add(deepCopy(old));
  }

  delete(id: number) {
    this._mutated ??= [];
    this.pm._project.decals[id] = null;
  }

  moveIdx(id: number, offset: number): number {
    const step = Math.sign(offset);
    let target = id;
    while (offset != 0) {
      target += step;
      if (target < 0) return -1;
      switch (this.asImmutable.at(target)) {
        case undefined:
          return -1;
        default:
          offset -= step;
        case null:
          continue;
      }
    }
    if (!this.asImmutable.at(target)) return -1;

    arraySwap(this.pm._project.decals, id, target);
    if (this.pm._project.decals[id]) this.pm._project.decals[id].id = id;
    // IDK perché c'è bisogno del ! qui
    if (this.pm._project.decals[target])
      this.pm._project.decals[target]!.id = target;
    this._mutated ??= [];
    this._mutated.push(id, target);
    return target;
  }
}
