import { describe, expect, it, vi } from "vitest";
import {
  normalizeProjectProfileInputs,
  projectProfileInputsToGeometryProfileState,
  projectProfileInputsToProfileState,
} from "./normalize";

describe("project profile normalization", () => {
  it("keeps canonical profile inputs free of view and compatibility fields", () => {
    const result = normalizeProjectProfileInputs(
      { geometryMode: "legacy-dsnp-pa", length: "8", breadth: "3", slenderness: "4", cylindricalInsertLength: "1", stations: "12" },
      "interactive-slenderness",
    );

    expect(result.profile).toEqual({
      geometryMode: "legacy-dsnp-pa",
      length: 8,
      breadth: 3,
      height: 2,
      cylindricalInsertLength: 1,
      stations: 12,
    });
    expect(result.profile).not.toHaveProperty("diameter");
    expect(result.profile).not.toHaveProperty("slenderness");
    expect(result.profile).not.toHaveProperty("showGrid");
    expect(result.profile).not.toHaveProperty("showPoints");
    expect(result.notices).toHaveLength(0);
  });

  it("keeps height authoritative for interactive height policy", () => {
    const result = normalizeProjectProfileInputs({ length: "8", height: "2", slenderness: "3" }, "interactive-height");

    expect(result.profile.height).toBe(2);
    expect(result.slenderness).toBe(4);
  });

  it("keeps slenderness authoritative for interactive slenderness policy", () => {
    const result = normalizeProjectProfileInputs({ length: "8", height: "4", slenderness: "4" }, "interactive-slenderness");

    expect(result.profile.height).toBe(2);
    expect(result.slenderness).toBe(4);
  });

  it("uses persisted height over diameter and slenderness", () => {
    const result = normalizeProjectProfileInputs({ length: 12, height: 3, diameter: 4, slenderness: 2 }, "persisted-profile");

    expect(result.profile.height).toBe(3);
    expect(result.profile.breadth).toBe(3);
    expect(result.slenderness).toBe(4);
  });

  it("uses persisted diameter when height is absent", () => {
    const result = normalizeProjectProfileInputs({ length: 12, diameter: 4, slenderness: 2 }, "persisted-profile");

    expect(result.profile.height).toBe(4);
    expect(result.profile.breadth).toBe(4);
    expect(result.slenderness).toBe(3);
    expect(result.notices).toHaveLength(0);
  });

  it("falls back to slenderness when persisted height and diameter are absent", () => {
    const result = normalizeProjectProfileInputs({ length: 12, slenderness: 6 }, "persisted-profile");

    expect(result.profile.height).toBe(2);
    expect(result.profile.breadth).toBe(2);
    expect(result.slenderness).toBe(6);
  });

  it("keeps DOM malformed breadth fallback distinct from JSON circular fallback", () => {
    const interactive = normalizeProjectProfileInputs({ length: 10, height: 5, breadth: "bad" }, "interactive-height");
    const persisted = normalizeProjectProfileInputs({ length: 10, height: 5, breadth: "bad" }, "persisted-profile");

    expect(interactive.profile.breadth).toBe(2);
    expect(persisted.profile.breadth).toBe(5);
  });

  it("clamps cylindrical insert and stations with structured notices", () => {
    const result = normalizeProjectProfileInputs(
      { length: 6, cylindricalInsertLength: 4, stations: 120, geometryMode: "bad-mode" },
      "interactive-slenderness",
    );

    expect(result.profile.cylindricalInsertLength).toBe(3);
    expect(result.profile.stations).toBe(80);
    expect(result.profile.geometryMode).toBe("current-formula");
    expect(result.notices).toEqual([
      expect.objectContaining({ field: "cylindricalInsertLength", reason: "clamped", requested: 4, normalized: 3, supplied: true }),
      expect.objectContaining({ field: "stations", reason: "clamped", requested: 120, normalized: 80, supplied: true }),
      expect.objectContaining({ field: "geometryMode", reason: "unsupported", requested: "bad-mode", normalized: "current-formula", supplied: true }),
    ]);
  });

  it("rounds fractional stations without adding adapter warnings", () => {
    const result = normalizeProjectProfileInputs({ stations: 12.7 }, "interactive-slenderness");

    expect(result.profile.stations).toBe(13);
    expect(result.notices).toHaveLength(0);
  });

  it("projects canonical profile to current compatibility ProfileState at the boundary", () => {
    const result = normalizeProjectProfileInputs({ length: 8, breadth: 3, slenderness: 4 }, "interactive-slenderness");

    expect(projectProfileInputsToProfileState(result, { showGrid: false, showPoints: true })).toEqual({
      geometryMode: "current-formula",
      length: 8,
      breadth: 3,
      height: 2,
      slenderness: 4,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 20,
      showGrid: false,
      showPoints: true,
    });
  });

  it("projects canonical profile to calculation geometry state without view flags", () => {
    const result = normalizeProjectProfileInputs({ length: 8, breadth: 3, slenderness: 4 }, "interactive-slenderness");

    expect(projectProfileInputsToGeometryProfileState(result.profile)).toEqual({
      geometryMode: "current-formula",
      length: 8,
      breadth: 3,
      height: 2,
      slenderness: 4,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 20,
    });
  });

  it("does not log from pure normalization", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    try {
      normalizeProjectProfileInputs({ length: "bad", geometryMode: "bad-mode" }, "persisted-profile");

      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleDebug).not.toHaveBeenCalled();
    } finally {
      consoleWarn.mockRestore();
      consoleDebug.mockRestore();
    }
  });
});
