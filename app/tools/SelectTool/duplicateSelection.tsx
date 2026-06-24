import { ProjectManager, deviceOfIntf, idxOfIntf } from "@/app/ProjectManager";
import { SelectTool } from "../SelectTool";

// Must update tool and project after call
export default function duplicateSelection(
  self: SelectTool,
  project: ProjectManager,
) {
  const oldSelected = [...self.selected];
  const newSelected = oldSelected.map((dev) => {
    const newId = project.duplicateDevice(dev)!;
    project.mutDevice(newId)!.pos[0] += 10;
    project.mutDevice(newId)!.pos[1] += 10;
    return newId;
  });

  const devIdToIdx = new Map(oldSelected.map((dev, idx) => [dev, idx]));
  // Copy device connections
  for (const [idx, dev] of oldSelected.entries()) {
    const connections = project
      .getAllConnections()
      .filter(([a]) => deviceOfIntf(a) == dev);
    for (const pair of connections) {
      const connectedIdx = devIdToIdx.get(deviceOfIntf(pair[1]));
      if (connectedIdx == null) continue;

      project.connect(
        newSelected[idx],
        idxOfIntf(pair[0]),
        newSelected[connectedIdx],
        idxOfIntf(pair[1]),
      );
    }
  }

  const newDecals = new Set<number>();
  for (const s of self.selectedDecals) {
    const newId = project.duplicateDecal(s)!;
    newDecals.add(newId);
    project.mutDecal(newId)!.pos[0] += 10;
    project.mutDecal(newId)!.pos[1] += 10;
  }
  self.selected = new Set(newSelected);
  self.selectedDecals = newDecals;
}
