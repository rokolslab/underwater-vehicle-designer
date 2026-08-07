import { describe, it, expect } from "vitest";
import {
  createDefaultInteractionState,
  selectEquipment,
  clearSelection,
  hoverEquipment,
  clearHover,
  resolveSelectionAfterDelete,
  type WorkbenchInteractionState,
} from "./interactionState";

describe("interactionState", () => {
  const defaultState = createDefaultInteractionState();

  describe("createDefaultInteractionState", () => {
    it("returns frozen state with nulls", () => {
      expect(defaultState.selectedEquipmentId).toBeNull();
      expect(defaultState.hoveredEquipmentId).toBeNull();
      expect(Object.isFrozen(defaultState)).toBe(true);
    });
  });

  describe("selectEquipment", () => {
    it("sets selectedEquipmentId", () => {
      const next = selectEquipment(defaultState, "eq-1");
      expect(next.selectedEquipmentId).toBe("eq-1");
      expect(next.hoveredEquipmentId).toBeNull();
      expect(Object.isFrozen(next)).toBe(true);
    });

    it("returns same state when id unchanged", () => {
      const state = selectEquipment(defaultState, "eq-1");
      const same = selectEquipment(state, "eq-1");
      expect(same).toBe(state);
    });

    it("does not mutate original state", () => {
      const original: WorkbenchInteractionState = {
        selectedEquipmentId: null,
        hoveredEquipmentId: null,
      };
      selectEquipment(original, "eq-1");
      expect(original.selectedEquipmentId).toBeNull();
    });
  });

  describe("clearSelection", () => {
    it("sets selectedEquipmentId to null", () => {
      const state = selectEquipment(defaultState, "eq-1");
      const next = clearSelection(state);
      expect(next.selectedEquipmentId).toBeNull();
      expect(Object.isFrozen(next)).toBe(true);
    });

    it("returns same state when already null", () => {
      const same = clearSelection(defaultState);
      expect(same).toBe(defaultState);
    });
  });

  describe("hoverEquipment", () => {
    it("sets hoveredEquipmentId", () => {
      const next = hoverEquipment(defaultState, "eq-1");
      expect(next.hoveredEquipmentId).toBe("eq-1");
      expect(Object.isFrozen(next)).toBe(true);
    });

    it("clears hover with null", () => {
      const state = hoverEquipment(defaultState, "eq-1");
      const next = hoverEquipment(state, null);
      expect(next.hoveredEquipmentId).toBeNull();
    });

    it("returns same state when id unchanged", () => {
      const state = hoverEquipment(defaultState, "eq-1");
      const same = hoverEquipment(state, "eq-1");
      expect(same).toBe(state);
    });
  });

  describe("clearHover", () => {
    it("sets hoveredEquipmentId to null", () => {
      const state = hoverEquipment(defaultState, "eq-1");
      const next = clearHover(state);
      expect(next.hoveredEquipmentId).toBeNull();
      expect(Object.isFrozen(next)).toBe(true);
    });

    it("returns same state when already null", () => {
      const same = clearHover(defaultState);
      expect(same).toBe(defaultState);
    });
  });

  describe("resolveSelectionAfterDelete", () => {
    it("returns null when selected was not the deleted item", () => {
      const beforeIds = ["eq-1", "eq-2", "eq-3", "eq-4"];
      const afterIds = ["eq-1", "eq-3", "eq-4"];
      expect(resolveSelectionAfterDelete("eq-2", "eq-3", beforeIds, afterIds)).toBe("eq-2");
    });

    it("returns previous item when deleted item is not first and prev remains", () => {
      const before = ["eq-1", "eq-2", "eq-3"];
      const after = ["eq-1", "eq-3"];
      expect(resolveSelectionAfterDelete("eq-2", "eq-2", before, after)).toBe("eq-1");
    });

    it("returns next item when deleted item is first", () => {
      const before = ["eq-1", "eq-2", "eq-3"];
      const after = ["eq-2", "eq-3"];
      expect(resolveSelectionAfterDelete("eq-1", "eq-1", before, after)).toBe("eq-2");
    });

    it("returns null when no after items remain", () => {
      expect(resolveSelectionAfterDelete("eq-1", "eq-1", ["eq-1"], [])).toBeNull();
    });

    it("falls back to nearest when prev and next are removed", () => {
      const before = ["eq-1", "eq-2", "eq-3", "eq-4"];
      const after = ["eq-1", "eq-4"];
      // deleted eq-2 at index 1, prev eq-1 exists, so picks eq-1
      expect(resolveSelectionAfterDelete("eq-2", "eq-2", before, after)).toBe("eq-1");
    });

    it("falls back to available after item when prev is also removed", () => {
      const before = ["eq-1", "eq-2", "eq-3"];
      const after = ["eq-3"];
      // deleted eq-2 at index 1, prev eq-1 gone, next eq-3 exists
      expect(resolveSelectionAfterDelete("eq-2", "eq-2", before, after)).toBe("eq-3");
    });

    it("returns null when currentSelectionId is null", () => {
      expect(resolveSelectionAfterDelete(null, "eq-1", ["eq-1", "eq-2"], ["eq-2"])).toBeNull();
    });
  });
});
