import { describe, expect, it } from "vitest";
import { geometryModePresentation, geometryModePresentations } from "./model";

describe("geometry mode presentation", () => {
  it("provides short labels and formula text for UI consumers", () => {
    expect(geometryModePresentations["current-formula"].label).toBe("Базовая формула");
    expect(geometryModePresentations["current-formula"].formulaText).toContain("B/2");
    expect(geometryModePresentations["current-formula"].formulaText).toContain("H/2");
    expect(geometryModePresentations["legacy-dsnp-pa"].label).toBe("Классическая методика");
    expect(geometryModePresentations["legacy-dsnp-pa"].formulaText).toContain("MaxWl(B)");
    expect(geometryModePresentations["legacy-dsnp-pa"].formulaText).toContain("MaxBt(H)");
  });

  it("normalizes unknown modes before selecting presentation", () => {
    expect(geometryModePresentation("unknown")).toBe(geometryModePresentations["current-formula"]);
  });
});
