import type { EquipmentConstraintStatus } from "../equipment/constraints";

export const UI_SEMANTIC_STATUSES = [
  "normal",
  "warning",
  "error",
  "experimental",
  "selected",
  "disabled",
  "stale",
  "running",
] as const;

export type UiSemanticStatus = (typeof UI_SEMANTIC_STATUSES)[number];

export const UI_STATUS_TOKEN_FAMILIES = ["text", "bg", "border", "accent"] as const;

export type UiStatusTokenFamily = (typeof UI_STATUS_TOKEN_FAMILIES)[number];

export type UiStatusCssVariable = `--status-${UiSemanticStatus}-${UiStatusTokenFamily}`;
export type UiStatusClassName = `ui-status--${UiSemanticStatus}`;

export const UI_STATUS_DATA_ATTRIBUTE = "data-ui-status";
export const UI_STATUS_CLASS_NAMES = UI_SEMANTIC_STATUSES.map(uiStatusClassName);

export function uiStatusCssVariable(status: UiSemanticStatus, family: UiStatusTokenFamily): UiStatusCssVariable {
  return `--status-${status}-${family}`;
}

export function uiStatusClassName(status: UiSemanticStatus): UiStatusClassName {
  return `ui-status--${status}`;
}

export function uiStatusDataValue(status: UiSemanticStatus): UiSemanticStatus {
  return status;
}

export function uiStatusHtmlAttributes(status: UiSemanticStatus): string {
  return `${UI_STATUS_DATA_ATTRIBUTE}="${uiStatusDataValue(status)}"`;
}

export function equipmentConstraintUiStatus(status: EquipmentConstraintStatus): UiSemanticStatus {
  if (status === "intersects") return "warning";
  if (status === "outsideHull" || status === "invalidEquipment") return "error";
  return "normal";
}

export function balanceSummaryUiStatus(hasWarnings: boolean): UiSemanticStatus {
  return hasWarnings ? "warning" : "normal";
}

export const BALANCE_EXPERIMENTAL_UI_STATUS: UiSemanticStatus = "experimental";
export const IMPORT_SUCCESS_UI_STATUS: UiSemanticStatus = "normal";
export const IMPORT_MIGRATION_UI_STATUS: UiSemanticStatus = "warning";
export const WEBGL_FALLBACK_UI_STATUS: UiSemanticStatus = "warning";
export const DISABLED_CONTROL_UI_STATUS: UiSemanticStatus = "disabled";
export const STALE_PLACEHOLDER_UI_STATUS: UiSemanticStatus = "stale";
export const RUNNING_PLACEHOLDER_UI_STATUS: UiSemanticStatus = "running";
