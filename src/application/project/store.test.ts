import { describe, expect, it, vi } from "vitest";
import { createDefaultProjectInputs } from "./defaults";
import { createProjectStore } from "./store";
import type { ProjectInputs } from "./model";
import type { BoxEquipmentItem } from "../../modules/equipment/model";

function makeProject(): ProjectInputs {
  const defaults = createDefaultProjectInputs();
  return {
    profile: { ...defaults.profile },
    equipment: [
      {
        id: "battery",
        name: "Battery",
        shape: "box",
        massKg: 12,
        position: { x: 1, y: 2, z: 3 },
        orientation: "x",
        dimensions: { lengthX: 1, breadthY: 0.5, heightZ: 0.4 },
        displacedVolume: 0.2,
      },
    ],
    balanceSettings: { ...defaults.balanceSettings },
  };
}

describe("ProjectStore", () => {
  it("owns a frozen initial snapshot and does not expose caller-owned objects", () => {
    const initial = makeProject();
    const store = createProjectStore(initial);
    const snapshot = store.getSnapshot();
    const initialEquipment = initial.equipment[0] as BoxEquipmentItem;

    (initial.profile as { length: number }).length = 99;
    (initialEquipment.position as { x: number }).x = 99;
    (initialEquipment.dimensions as { lengthX: number }).lengthX = 99;
    (initial.balanceSettings as { gravityMPerS2: number }).gravityMPerS2 = 99;

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.profile)).toBe(true);
    expect(Object.isFrozen(snapshot.equipment)).toBe(true);
    expect(Object.isFrozen(snapshot.equipment[0])).toBe(true);
    expect(Object.isFrozen(snapshot.equipment[0].position)).toBe(true);
    expect(Object.isFrozen(snapshot.equipment[0].dimensions)).toBe(true);
    expect(Object.isFrozen(snapshot.balanceSettings)).toBe(true);
    expect(snapshot.profile.length).toBe(6);
    expect(snapshot.equipment[0].position.x).toBe(1);
    expect(snapshot.equipment[0].dimensions.lengthX).toBe(1);
    expect(snapshot.balanceSettings.gravityMPerS2).toBe(9.80665);
  });

  it("commits slice updates while preserving untouched slice identity", () => {
    const store = createProjectStore(createDefaultProjectInputs());
    const before = store.getSnapshot();
    const after = store.setProfile({ ...before.profile, length: 8 });

    expect(after).not.toBe(before);
    expect(after.profile).not.toBe(before.profile);
    expect(after.equipment).toBe(before.equipment);
    expect(after.balanceSettings).toBe(before.balanceSettings);
    expect(after.profile.length).toBe(8);
  });

  it("treats reference-equal root and slices as no-op updates without notification", () => {
    const store = createProjectStore(createDefaultProjectInputs());
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();

    expect(store.setProfile(before.profile)).toBe(before);
    expect(store.setEquipment(before.equipment)).toBe(before);
    expect(store.setBalanceSettings(before.balanceSettings)).toBe(before);
    expect(store.replaceProject(before)).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("clones committed caller-owned objects", () => {
    const store = createProjectStore(createDefaultProjectInputs());
    const equipment = makeProject().equipment;
    const snapshot = store.setEquipment(equipment);
    const equipmentItem = equipment[0] as BoxEquipmentItem;

    (equipmentItem.position as { y: number }).y = 99;
    (equipmentItem.dimensions as { breadthY: number }).breadthY = 99;

    expect(snapshot.equipment[0].position.y).toBe(2);
    expect(snapshot.equipment[0].dimensions.breadthY).toBe(0.5);
  });

  it("supports duplicate subscriptions, idempotent unsubscribe, and fixed notification registrations", () => {
    const store = createProjectStore(createDefaultProjectInputs());
    const calls: string[] = [];
    const listener = () => calls.push("listener");
    const unsubscribeA = store.subscribe(listener);
    const unsubscribeB = store.subscribe(listener);
    store.subscribe(() => {
      calls.push("late registrar");
      store.subscribe(() => calls.push("late"));
    });

    store.setProfile({ ...store.getSnapshot().profile, length: 7 });
    unsubscribeA();
    unsubscribeA();
    store.setProfile({ ...store.getSnapshot().profile, length: 8 });
    unsubscribeB();
    store.setProfile({ ...store.getSnapshot().profile, length: 9 });

    expect(calls).toEqual([
      "listener",
      "listener",
      "late registrar",
      "listener",
      "late registrar",
      "late",
      "late registrar",
      "late",
      "late",
    ]);
  });

  it("continues notification after listener failure and rethrows without rollback", () => {
    const store = createProjectStore(createDefaultProjectInputs());
    const error = new Error("boom");
    const second = vi.fn();
    store.subscribe(() => {
      throw error;
    });
    store.subscribe(second);

    expect(() => store.setProfile({ ...store.getSnapshot().profile, length: 7 })).toThrow(error);
    expect(second).toHaveBeenCalledWith(store.getSnapshot());
    expect(store.getSnapshot().profile.length).toBe(7);
  });

  it("rejects reentrant commits during notification", () => {
    const store = createProjectStore(createDefaultProjectInputs());
    store.subscribe(() => {
      store.setProfile({ ...store.getSnapshot().profile, length: 9 });
    });

    expect(() => store.setProfile({ ...store.getSnapshot().profile, length: 7 })).toThrow(/reentrant/i);
    expect(store.getSnapshot().profile.length).toBe(7);
  });

  it("creates isolated default project inputs", () => {
    const first = createDefaultProjectInputs();
    const second = createDefaultProjectInputs();

    expect(first).not.toBe(second);
    expect(first.profile).not.toBe(second.profile);
    expect(first.balanceSettings).not.toBe(second.balanceSettings);
    expect(first.equipment).not.toBe(second.equipment);
    expect(first).toEqual(second);
  });
});
