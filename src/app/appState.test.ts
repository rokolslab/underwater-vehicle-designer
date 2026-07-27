import { describe, expect, it } from "vitest";
import { createAppStateController } from "./appState";
import type { ControlElements } from "../modules/ui/controls";

function input(value: string, checked = false): HTMLInputElement {
  return { value, checked } as HTMLInputElement;
}

function select(value: string): HTMLSelectElement {
  return { value } as HTMLSelectElement;
}

function makeControls(): ControlElements {
  return {
    length: input("6"),
    breadth: input("2"),
    height: input("2"),
    slenderness: input("3"),
    cylindricalInsertLength: input("0"),
    geometryMode: select("current-formula"),
    stations: input("20"),
    showGrid: input("", true),
    showPoints: input("", true),
  };
}

describe("app state", () => {
  it("uses current formula geometry mode by default", () => {
    const controls = makeControls();

    const state = createAppStateController(controls).readState("slenderness");

    expect(state.geometryMode).toBe("current-formula");
    expect(state.breadth).toBe(2);
    expect(state.height).toBe(2);
    expect(state.diameter).toBe(2);
    expect(controls.geometryMode.value).toBe("current-formula");
  });

  it("keeps breadth independent while slenderness controls height", () => {
    const controls = makeControls();
    controls.length.value = "8";
    controls.breadth.value = "3";
    controls.slenderness.value = "4";

    const state = createAppStateController(controls).readState("slenderness");

    expect(state.breadth).toBe(3);
    expect(state.height).toBe(2);
    expect(state.diameter).toBe(2);
    expect(state.slenderness).toBe(4);
  });

  it("reads legacy geometry mode from controls", () => {
    const controls = makeControls();
    controls.geometryMode.value = "legacy-dsnp-pa";

    const state = createAppStateController(controls).readState("slenderness");

    expect(state.geometryMode).toBe("legacy-dsnp-pa");
    expect(controls.geometryMode.value).toBe("legacy-dsnp-pa");
  });

  it("normalizes invalid geometry mode to current formula", () => {
    const controls = makeControls();
    controls.geometryMode.value = "bad-mode";

    const state = createAppStateController(controls).readState("slenderness");

    expect(state.geometryMode).toBe("current-formula");
    expect(controls.geometryMode.value).toBe("current-formula");
  });

  it("keeps slenderness authoritative when it was edited last", () => {
    const controls = makeControls();
    controls.length.value = "8";
    controls.slenderness.value = "4";

    const state = createAppStateController(controls).readState("slenderness");

    expect(state.height).toBe(2);
    expect(state.diameter).toBe(2);
    expect(controls.height.value).toBe("2");
  });

  it("keeps height authoritative when it was edited last", () => {
    const controls = makeControls();
    controls.length.value = "8";
    controls.height.value = "2";

    const state = createAppStateController(controls).readState("height");

    expect(state.slenderness).toBe(4);
    expect(state.diameter).toBe(state.height);
    expect(controls.slenderness.value).toBe("4");
  });

  it("preserves imported height by making height authoritative", () => {
    const controls = makeControls();
    controls.length.value = "10";
    controls.breadth.value = "3";
    controls.height.value = "4";
    controls.slenderness.value = "2";

    const state = createAppStateController(controls).readState("height");

    expect(state.breadth).toBe(3);
    expect(state.height).toBe(4);
    expect(state.diameter).toBe(4);
    expect(state.slenderness).toBe(2.5);
    expect(controls.slenderness.value).toBe("2.5");
  });

  it("normalizes invalid breadth and height inputs", () => {
    const controls = makeControls();
    controls.length.value = "6";
    controls.breadth.value = "bad";
    controls.height.value = "bad";
    controls.slenderness.value = "3";

    const state = createAppStateController(controls).readState("height");

    expect(state.breadth).toBe(2);
    expect(state.height).toBe(2);
    expect(state.diameter).toBe(2);
    expect(state.slenderness).toBe(3);
    expect(controls.breadth.value).toBe("2");
    expect(controls.slenderness.value).toBe("3");
  });

  it("normalizes cylindrical insert length as a non-negative meter value", () => {
    const controls = makeControls();
    controls.cylindricalInsertLength.value = "1.5";

    const state = createAppStateController(controls).readState("slenderness");

    expect(state.cylindricalInsertLength).toBe(1.5);
    expect(controls.cylindricalInsertLength.value).toBe("1.5");
  });

  it("clamps negative cylindrical insert length to zero", () => {
    const controls = makeControls();
    controls.cylindricalInsertLength.value = "-2";

    const state = createAppStateController(controls).readState("slenderness");

    expect(state.cylindricalInsertLength).toBe(0);
    expect(controls.cylindricalInsertLength.value).toBe("0");
  });

  it("clamps cylindrical insert length to half of the total length", () => {
    const controls = makeControls();
    controls.length.value = "6";
    controls.cylindricalInsertLength.value = "4";

    const state = createAppStateController(controls).readState("slenderness");

    expect(state.cylindricalInsertLength).toBe(3);
    expect(controls.cylindricalInsertLength.value).toBe("3");
    expect(controls.cylindricalInsertLength.max).toBe("3");
  });

  it("clamps stations and resets toggles", () => {
    const controls = makeControls();
    controls.length.value = "bad";
    controls.cylindricalInsertLength.value = "2";
    controls.stations.value = "120";
    controls.showGrid.checked = false;
    controls.showPoints.checked = false;
    const controller = createAppStateController(controls);

    const state = controller.readState("slenderness");
    expect(state.length).toBe(6);
    expect(state.cylindricalInsertLength).toBe(2);
    expect(controls.cylindricalInsertLength.max).toBe("3");
    expect(state.stations).toBe(80);

    const reset = controller.reset();
    expect(reset.breadth).toBe(2);
    expect(reset.height).toBe(2);
    expect(reset.diameter).toBe(2);
    expect(reset.cylindricalInsertLength).toBe(0);
    expect(reset.geometryMode).toBe("current-formula");
    expect(controls.geometryMode.value).toBe("current-formula");
    expect(reset.stations).toBe(20);
    expect(reset.showGrid).toBe(true);
    expect(reset.showPoints).toBe(true);
  });
});
