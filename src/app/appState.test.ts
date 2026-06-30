import { describe, expect, it } from "vitest";
import { createAppStateController } from "./appState";
import type { ControlElements } from "../modules/ui/controls";

function input(value: string, checked = false): HTMLInputElement {
  return { value, checked } as HTMLInputElement;
}

function makeControls(): ControlElements {
  return {
    length: input("6"),
    slenderness: input("3"),
    diameter: input("2"),
    stations: input("20"),
    showGrid: input("", true),
    showPoints: input("", true),
  };
}

describe("app state", () => {
  it("keeps slenderness authoritative when it was edited last", () => {
    const controls = makeControls();
    controls.length.value = "8";
    controls.slenderness.value = "4";

    const state = createAppStateController(controls).readState("slenderness");

    expect(state.diameter).toBe(2);
    expect(controls.diameter.value).toBe("2");
  });

  it("keeps diameter authoritative when it was edited last", () => {
    const controls = makeControls();
    controls.length.value = "8";
    controls.diameter.value = "2";

    const state = createAppStateController(controls).readState("diameter");

    expect(state.slenderness).toBe(4);
    expect(controls.slenderness.value).toBe("4");
  });

  it("clamps stations and resets toggles", () => {
    const controls = makeControls();
    controls.length.value = "bad";
    controls.stations.value = "120";
    controls.showGrid.checked = false;
    controls.showPoints.checked = false;
    const controller = createAppStateController(controls);

    const state = controller.readState("slenderness");
    expect(state.length).toBe(6);
    expect(state.stations).toBe(80);

    const reset = controller.reset();
    expect(reset.stations).toBe(20);
    expect(reset.showGrid).toBe(true);
    expect(reset.showPoints).toBe(true);
  });
});
