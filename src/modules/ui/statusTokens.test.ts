import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  UI_SEMANTIC_STATUSES,
  UI_STATUS_CLASS_NAMES,
  UI_STATUS_DATA_ATTRIBUTE,
  UI_STATUS_TOKEN_FAMILIES,
  BALANCE_EXPERIMENTAL_UI_STATUS,
  DISABLED_CONTROL_UI_STATUS,
  IMPORT_MIGRATION_UI_STATUS,
  IMPORT_SUCCESS_UI_STATUS,
  RUNNING_PLACEHOLDER_UI_STATUS,
  STALE_PLACEHOLDER_UI_STATUS,
  WEBGL_FALLBACK_UI_STATUS,
  balanceSummaryUiStatus,
  equipmentConstraintUiStatus,
  uiStatusClassName,
  uiStatusCssVariable,
  uiStatusDataValue,
  uiStatusHtmlAttributes,
} from "./statusTokens";

describe("UI semantic status tokens", () => {
  it("keeps the UX-1 semantic vocabulary explicit", () => {
    expect(UI_SEMANTIC_STATUSES).toEqual([
      "normal",
      "warning",
      "error",
      "experimental",
      "selected",
      "disabled",
      "stale",
      "running",
    ]);
  });

  it("defines the stable DOM status presentation convention", () => {
    expect(UI_STATUS_DATA_ATTRIBUTE).toBe("data-ui-status");
    expect(UI_STATUS_CLASS_NAMES).toContain("ui-status--normal");
    expect(uiStatusClassName("warning")).toBe("ui-status--warning");
    expect(uiStatusDataValue("error")).toBe("error");
    expect(uiStatusHtmlAttributes("experimental")).toBe('data-ui-status="experimental"');
  });

  it("maps every status to text, background, border, and accent CSS variables", () => {
    const styles = readFileSync("src/app/styles.css", "utf8");

    for (const status of UI_SEMANTIC_STATUSES) {
      for (const family of UI_STATUS_TOKEN_FAMILIES) {
        expect(styles, uiStatusCssVariable(status, family)).toContain(`${uiStatusCssVariable(status, family)}:`);
      }
    }
  });

  it("maps equipment domain statuses to semantic presentation statuses", () => {
    expect(equipmentConstraintUiStatus("ok")).toBe("normal");
    expect(equipmentConstraintUiStatus("intersects")).toBe("warning");
    expect(equipmentConstraintUiStatus("outsideHull")).toBe("error");
    expect(equipmentConstraintUiStatus("invalidEquipment")).toBe("error");
  });

  it("defines semantic statuses for current adapter-level notices and placeholders", () => {
    expect(balanceSummaryUiStatus(false)).toBe("normal");
    expect(balanceSummaryUiStatus(true)).toBe("warning");
    expect(BALANCE_EXPERIMENTAL_UI_STATUS).toBe("experimental");
    expect(IMPORT_SUCCESS_UI_STATUS).toBe("normal");
    expect(IMPORT_MIGRATION_UI_STATUS).toBe("warning");
    expect(WEBGL_FALLBACK_UI_STATUS).toBe("warning");
    expect(DISABLED_CONTROL_UI_STATUS).toBe("disabled");
    expect(STALE_PLACEHOLDER_UI_STATUS).toBe("stale");
    expect(RUNNING_PLACEHOLDER_UI_STATUS).toBe("running");
  });

  it("keeps the pure status contract free of runtime logging", () => {
    const source = readFileSync("src/modules/ui/statusTokens.ts", "utf8");

    expect(source).not.toContain("logger");
    expect(source).not.toContain("console.");
  });
});
