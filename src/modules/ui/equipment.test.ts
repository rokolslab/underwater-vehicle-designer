import { describe, expect, it, vi } from "vitest";
import { evaluateEquipmentConstraints } from "../equipment/constraints";
import type { EquipmentConstraintReport } from "../equipment/constraints";
import { createDefaultEquipmentItem, updateEquipmentItem } from "../equipment/placement";
import { makeProfileSnapshot } from "../geometry/profile";
import { makeEquipmentAccessibilityIds, readEquipmentUpdate, renderEquipmentEditor, updateEquipmentRowsInteraction } from "./equipment";

function row(values: Record<string, string>): HTMLElement {
  return {
    querySelector(selector: string) {
      const field = selector.match(/\[data-field="([^"]+)"\]/)?.[1];
      if (!field || !(field in values)) return null;
      return { value: values[field] };
    },
  } as unknown as HTMLElement;
}

const baseRowValues = {
  name: "Payload",
  massKg: "12",
  x: "1",
  y: "2",
  z: "3",
  orientation: "x",
};

describe("equipment ui", () => {
  it("can read an equipment update without dimensions during shape changes", () => {
    const update = readEquipmentUpdate(
      row({
        ...baseRowValues,
        shape: "cylinder",
        radius: "0.8",
        length: "",
      }),
      { includeDimensions: false },
    );

    expect(update.shape).toBe("cylinder");
    expect(update.dimensions).toBeUndefined();
  });

  it("uses new-shape default dimensions when switching from sphere to cylinder", () => {
    const [sphere] = updateEquipmentItem([createDefaultEquipmentItem({ idFactory: () => "a" })], "a", {
      dimensions: { radius: 0.8 },
    });
    const update = readEquipmentUpdate(
      row({
        ...baseRowValues,
        shape: "cylinder",
        radius: "0.8",
        length: "",
      }),
      { includeDimensions: false },
    );

    const [switched] = updateEquipmentItem([sphere], "a", update);

    expect(switched.shape).toBe("cylinder");
    if (switched.shape !== "cylinder") throw new Error("expected cylinder");
    expect(switched.dimensions).toEqual({ radius: 0.2, length: 0.5 });
  });

  it("uses new-shape default dimensions when switching from sphere to box", () => {
    const sphere = createDefaultEquipmentItem({ idFactory: () => "a" });
    const update = readEquipmentUpdate(
      row({
        ...baseRowValues,
        shape: "box",
        radius: "0.2",
        lengthX: "",
      }),
      { includeDimensions: false },
    );

    const [switched] = updateEquipmentItem([sphere], "a", update);

    expect(switched.shape).toBe("box");
    if (switched.shape !== "box") throw new Error("expected box");
    expect(switched.dimensions).toEqual({ lengthX: 0.4, breadthY: 0.4, heightZ: 0.4 });
  });
  it("renders equipment constraint status and warning text", () => {
    const item = {
      id: "outside",
      name: "Outside",
      shape: "sphere" as const,
      massKg: 1,
      position: { x: 4, y: 1.4, z: 0 },
      orientation: "x" as const,
      dimensions: { radius: 0.2 },
    };
    const report = evaluateEquipmentConstraints(
      makeProfileSnapshot({
        length: 10,
        breadth: 2,
        height: 2,
        slenderness: 5,
        diameter: 2,
        cylindricalInsertLength: 0,
        stations: 10,
      }),
      [item],
    );
    const container = { innerHTML: "" } as HTMLElement;

    renderEquipmentEditor(container, [item], report);

    expect(container.innerHTML).toContain("equipment-row--outsideHull");
    expect(container.innerHTML).toContain("ui-status--error");
    expect(container.innerHTML).toContain('data-ui-status="error"');
    expect(container.innerHTML).toContain("Вне корпуса");
    expect(container.innerHTML).toContain("Проблемы компоновки");
  });
  it("labels the equipment name field as designation", () => {
    const item = createDefaultEquipmentItem({ idFactory: () => "item-1", name: "Шар 1" });
    const container = { innerHTML: "" } as HTMLElement;

    renderEquipmentEditor(container, [item]);

    expect(container.innerHTML).toContain("Наименование");
    expect(container.innerHTML).not.toContain(">Имя<");
  });
  it("renders Body/SNAME-NED directions and metric units", () => {
    const item = createDefaultEquipmentItem({ idFactory: () => "item-1" });
    const container = { innerHTML: "" } as HTMLElement;

    renderEquipmentEditor(container, [item]);

    expect(container.innerHTML).toContain("X, м → нос");
    expect(container.innerHTML).toContain("Y, м → правый борт");
    expect(container.innerHTML).toContain("Z, м → вниз");
    expect(container.innerHTML).toContain("X — нос");
  });

  it("renders number inputs with decimal input mode for mobile keyboards", () => {
    const item = createDefaultEquipmentItem({ idFactory: () => "item-1" });
    const container = { innerHTML: "" } as HTMLElement;

    renderEquipmentEditor(container, [item]);

    expect(container.innerHTML).toContain('data-field="massKg" type="number" inputmode="decimal"');
    expect(container.innerHTML).toContain('data-field="x" type="number" inputmode="decimal"');
    expect(container.innerHTML).toContain('data-field="radius" type="number" inputmode="decimal"');
  });

  it("generates deterministic safe accessibility ids without changing equipment ids", () => {
    const importedId = "pump / port #1";
    const ids = makeEquipmentAccessibilityIds(importedId, 2);
    const item = createDefaultEquipmentItem({ idFactory: () => importedId, name: "Pump" });
    const container = { innerHTML: "" } as HTMLElement;

    renderEquipmentEditor(container, [item]);

    expect(ids.row).toBe("equipment-2-70-75-6d-70-20-2f-20-70-6f-72-74-20-23-31-row");
    expect(ids.row).not.toContain(importedId);
    expect(container.innerHTML).toContain('data-equipment-id="pump / port #1"');
    expect(container.innerHTML).toContain('id="equipment-0-70-75-6d-70-20-2f-20-70-6f-72-74-20-23-31-row"');
    expect(container.innerHTML).toContain('id="equipment-0-70-75-6d-70-20-2f-20-70-6f-72-74-20-23-31-name-label"');
    expect(container.innerHTML).toContain('id="equipment-0-70-75-6d-70-20-2f-20-70-6f-72-74-20-23-31-status"');
  });

  it("links equipment rows to visible status and issue text", () => {
    const item = {
      id: "outside",
      name: "Outside",
      shape: "sphere" as const,
      massKg: 1,
      position: { x: 4, y: 1.4, z: 0 },
      orientation: "x" as const,
      dimensions: { radius: 0.2 },
    };
    const report = evaluateEquipmentConstraints(
      makeProfileSnapshot({
        length: 10,
        breadth: 2,
        height: 2,
        slenderness: 5,
        diameter: 2,
        cylindricalInsertLength: 0,
        stations: 10,
      }),
      [item],
    );
    const container = { innerHTML: "" } as HTMLElement;

    renderEquipmentEditor(container, [item], report);

    expect(container.innerHTML).toContain('aria-labelledby="equipment-0-6f-75-74-73-69-64-65-name-label"');
    expect(container.innerHTML).toContain('aria-describedby="equipment-0-6f-75-74-73-69-64-65-status equipment-0-6f-75-74-73-69-64-65-issues"');
    expect(container.innerHTML).toContain('id="equipment-0-6f-75-74-73-69-64-65-issues"');
  });

  it("renders equipment rows with tabindex for keyboard focus", () => {
    const item = {
      id: "focus-test",
      name: "Focus",
      shape: "sphere" as const,
      massKg: 1,
      position: { x: 0, y: 0, z: 0 },
      orientation: "x" as const,
      dimensions: { radius: 0.1 },
    };
    const container = { innerHTML: "" } as HTMLElement;
    renderEquipmentEditor(container, [item]);
    expect(container.innerHTML).toContain('tabindex="0"');
  });

  it("preserves delete button data-action for keyboard event delegation", () => {
    const item = {
      id: "del-test",
      name: "Del",
      shape: "sphere" as const,
      massKg: 1,
      position: { x: 0, y: 0, z: 0 },
      orientation: "x" as const,
      dimensions: { radius: 0.1 },
    };
    const container = { innerHTML: "" } as HTMLElement;
    renderEquipmentEditor(container, [item]);
    expect(container.innerHTML).toContain('data-action="delete-equipment"');
  });

  it("uses mapped Russian issue descriptions instead of raw domain messages", () => {
    const item = {
      id: "eq-msg",
      name: "Msg",
      shape: "sphere" as const,
      massKg: 1,
      position: { x: 0, y: 0, z: 0 },
      orientation: "x" as const,
      dimensions: { radius: 0.1 },
    };
    const report = {
      issues: [{ equipmentId: "eq-msg", reason: "outsideHull" as const, message: "Оборудование выходит за сечение корпуса при body.x=1.5 м (s=3.5 м).", status: "outsideHull" as const }],
      issuesById: new Map([["eq-msg", [{ equipmentId: "eq-msg", reason: "outsideHull", message: "Оборудование выходит за сечение корпуса при body.x=1.5 м (s=3.5 м).", status: "outsideHull" }]]]),
      statusById: new Map([["eq-msg", "outsideHull" as const]]),
    } as unknown as EquipmentConstraintReport;
    const container = { innerHTML: "" } as HTMLElement;
    renderEquipmentEditor(container, [item], report);
    expect(container.innerHTML).not.toContain("body.x");
    expect(container.innerHTML).not.toContain("s=3.5");
    expect(container.innerHTML).toContain("обводы корпуса");
  });
});

describe("updateEquipmentRowsInteraction", () => {
  it("toggles selected class and aria-selected on targeted row", () => {
    const container = {
      innerHTML: "",
      querySelectorAll: vi.fn(),
    } as unknown as HTMLElement;

    const row = {
      dataset: { equipmentId: "eq-1" },
      classList: { toggle: vi.fn(), contains: vi.fn() },
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    } as unknown as HTMLElement;

    (container.querySelectorAll as ReturnType<typeof vi.fn>).mockReturnValue([row]);

    const prev = { selectedEquipmentId: null, hoveredEquipmentId: null };
    const next = { selectedEquipmentId: "eq-1", hoveredEquipmentId: null };
    updateEquipmentRowsInteraction(container, prev, next);

    expect(row.classList.toggle).toHaveBeenCalledWith("equipment-row--selected", true);
  });

  it("clears selected attributes when selection is removed", () => {
    const container = {
      innerHTML: "",
      querySelectorAll: vi.fn(),
    } as unknown as HTMLElement;

    const row = {
      dataset: { equipmentId: "eq-1" },
      classList: { toggle: vi.fn(), contains: vi.fn() },
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    } as unknown as HTMLElement;

    (container.querySelectorAll as ReturnType<typeof vi.fn>).mockReturnValue([row]);

    const prev = { selectedEquipmentId: "eq-1", hoveredEquipmentId: null };
    const next = { selectedEquipmentId: null, hoveredEquipmentId: null };
    updateEquipmentRowsInteraction(container, prev, next);

    expect(row.removeAttribute).toHaveBeenCalledWith("aria-selected");
  });

  it("skips update when previous and next are identical", () => {
    const container = {
      innerHTML: "",
      querySelectorAll: vi.fn(),
    } as unknown as HTMLElement;

    const state = { selectedEquipmentId: "eq-1", hoveredEquipmentId: null };
    updateEquipmentRowsInteraction(container, state, state);

    expect(container.querySelectorAll).not.toHaveBeenCalled();
  });
});
