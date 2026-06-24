import { doRectsOverlap, pointInRect, rectBetween } from "@/app/common";
import { makeLabelTool } from "../LabelTool";
import { makeRectTool } from "../RectTool";
import { SelectTool } from "../SelectTool";
import { AnyTool, CanvasEvent, ToolConstructor, ToolCtx } from "../Tool";
import duplicateSelection from "./duplicateSelection";

export default function onEvent(ctx: ToolCtx<SelectTool>, ev: CanvasEvent) {
  const originalDevices = new Set(ctx.toolRef.current.selected);
  const originalDecals = new Set(ctx.toolRef.current.selectedDecals);

  const self = ctx.toolRef.current;
  switch (ev.type) {
    case "doubleclick":
      if (self.selected.size != 0) return;
      if (self.selectedDecals.size != 1) return;
      const decalIdx = self.selectedDecals.values().next().value!;
      const decal = ctx.projectRef.current.immutableDecals[decalIdx]!;

      const setTool = (constructor: ToolConstructor<AnyTool>) => {
        ctx.toolRef.current = constructor(
          self,
          ctx.projectRef.current,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;
        ctx.updateTool();
      };

      switch (decal.type) {
        case "text":
          setTool(makeLabelTool);
          return;
        case "rect":
          setTool(makeRectTool);
          return;
        default:
          return;
      }
    case "mousedown":
      if (ev.device) {
        if (!ev.shiftKey && !self.selected.has(ev.device.id)) {
          self.selected.clear();
          self.selectedDecals.clear();
        }
        self.selected.add(ev.device.id);
        self.lastCursorPos = ev.pos;
      } else if (ev.decal) {
        if (!ev.shiftKey && !self.selectedDecals.has(ev.decal.id)) {
          self.selected.clear();
          self.selectedDecals.clear();
        }
        self.selectedDecals.add(ev.decal.id);
        self.lastCursorPos = ev.pos;
      } else {
        if (!ev.shiftKey) {
          self.selected.clear();
          self.selectedDecals.clear();
        }
        self.selectionRectangle = ev.pos;
        self.lastCursorPos = ev.pos;
        // ctx.updateTool();
      }
      break;
    case "mousemove":
      if (self.lastCursorPos) {
        if (!self.selectionRectangle) {
          for (const dev of self.selected) {
            ctx.projectRef.current.mutDevice(dev)!.pos[0] +=
              ev.pos[0] - self.lastCursorPos[0];
            ctx.projectRef.current.mutDevice(dev)!.pos[1] +=
              ev.pos[1] - self.lastCursorPos[1];
          }
          for (const dec of self.selectedDecals) {
            ctx.projectRef.current.mutDecal(dec)!.pos[0] +=
              ev.pos[0] - self.lastCursorPos[0];
            ctx.projectRef.current.mutDecal(dec)!.pos[1] +=
              ev.pos[1] - self.lastCursorPos[1];
          }
          self.movedSelection = true;
          ctx.updateProject();
        }
        self.lastCursorPos = ev.pos;
        ctx.updateTool();
      }
      return;
    case "mouseleave":
    case "mouseup":
      if (self.lastCursorPos) {
        if (self.selectionRectangle) {
          const selection = rectBetween(
            self.selectionRectangle,
            self.lastCursorPos,
          );
          self.lastCursorPos = undefined;
          self.selectionRectangle = undefined;
          if (selection[2] == 0 || selection[3] == 0) return;
          ctx.projectRef.current.immutableDevices
            .values()
            .filter((it) => pointInRect(it.pos, selection))
            .forEach((it) => self.selected.add(it.id));

          ctx.projectRef.current.immutableDecals
            .filter(
              (it) =>
                it &&
                (it.type == "rect"
                  ? doRectsOverlap([...it.pos, ...it.size], selection)
                  : pointInRect(it.pos, selection)),
            )
            .forEach((it) => self.selectedDecals.add(it!.id));
          ctx.updateTool();
          return;
        } else {
          const diffX = ev.pos[0] - self.lastCursorPos[0];
          const diffY = ev.pos[1] - self.lastCursorPos[1];
          if (diffX || diffY) {
            self.movedSelection = true;
            for (const dev of self.selected) {
              ctx.projectRef.current.mutDevice(dev)!.pos[0] += diffX;
              ctx.projectRef.current.mutDevice(dev)!.pos[1] += diffY;
            }
            for (const dec of self.selectedDecals) {
              ctx.projectRef.current.mutDecal(dec)!.pos[0] += diffX;
              ctx.projectRef.current.mutDecal(dec)!.pos[1] += diffY;
            }
          }
          if (self.movedSelection) ctx.updateProject(true);
          self.movedSelection = false;
          self.lastCursorPos = undefined;
        }
      }
      break;
    case "keydown":
      ev.consumed = true;
      switch (ev.key) {
        case "Delete": {
          if (!self.selected.size && !self.selectedDecals.size) return;
          for (const s of self.selected) {
            ctx.projectRef.current.deleteDevice(s);
          }
          for (const s of self.selectedDecals) {
            ctx.projectRef.current.removeDecal(s);
          }
          self.selected.clear();
          self.selectedDecals.clear();
          ctx.updateTool();
          ctx.updateProject(true);
          return;
        }
        case "d": {
          duplicateSelection(ctx.toolRef.current, ctx.projectRef.current);
          ctx.updateTool();
          ctx.updateProject(true);
          return;
        }
        default:
          ev.consumed = false;
      }
  }
  if (
    originalDevices.symmetricDifference(self.selected).size > 0 ||
    originalDecals.symmetricDifference(self.selectedDecals).size > 0
  ) {
    self.selected = new Set(self.selected);
    self.selectedDecals = new Set(self.selectedDecals);
    ctx.updateTool();
  }
}
