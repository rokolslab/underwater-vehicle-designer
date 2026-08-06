import type { ProjectEvaluation, ProjectInputs } from "../../application/project/model";
import type { EquipmentConstraintStatus } from "../equipment/constraints";
import { geometryModePresentation } from "../geometry/model";
import { formatNumber } from "../../shared/format";
import {
  UI_STATUS_CLASS_NAMES,
  UI_STATUS_DATA_ATTRIBUTE,
  balanceSummaryUiStatus,
  equipmentConstraintUiStatus,
  uiStatusClassName,
  uiStatusDataValue,
  type UiSemanticStatus,
} from "./statusTokens";

export interface WorkbenchSummaryElements {
  readonly dimensions: HTMLElement;
  readonly geometryMode: HTMLElement;
  readonly stations: HTMLElement;
  readonly equipmentCount: HTMLElement;
  readonly constraints: HTMLElement;
  readonly balance: HTMLElement;
}

export interface WorkbenchSummaryViewModel {
  readonly dimensionsText: string;
  readonly geometryModeText: string;
  readonly stationsText: string;
  readonly equipmentCountText: string;
  readonly constraintsText: string;
  readonly constraintsStatus: UiSemanticStatus;
  readonly balanceText: string;
  readonly balanceStatus: UiSemanticStatus;
}

function mostSevereConstraintStatus(statuses: Iterable<EquipmentConstraintStatus>): EquipmentConstraintStatus {
  let hasWarning = false;
  for (const status of statuses) {
    if (status === "outsideHull" || status === "invalidEquipment") return status;
    if (status === "intersects") hasWarning = true;
  }
  return hasWarning ? "intersects" : "ok";
}

function constraintSummaryText(status: EquipmentConstraintStatus, issueCount: number): string {
  if (status === "outsideHull" || status === "invalidEquipment") return `Ошибка: ${issueCount}`;
  if (status === "intersects") return `Предупреждение: ${issueCount}`;
  return "Норма";
}

function applySummaryStatus(element: HTMLElement, status: UiSemanticStatus): void {
  element.classList.remove(...UI_STATUS_CLASS_NAMES);
  element.classList.add(uiStatusClassName(status));
  element.setAttribute(UI_STATUS_DATA_ATTRIBUTE, uiStatusDataValue(status));
}

export function makeWorkbenchSummaryViewModel(inputs: ProjectInputs, evaluation: ProjectEvaluation): WorkbenchSummaryViewModel {
  const profile = evaluation.hullGeometry.state;
  const constraintStatus = mostSevereConstraintStatus(evaluation.constraints.statusById.values());
  const balanceWarningCount = evaluation.balance.warnings.length;
  return Object.freeze({
    dimensionsText: `L ${formatNumber(profile.length, 2)} м; B ${formatNumber(profile.breadth, 2)} м; H ${formatNumber(profile.height, 2)} м`,
    geometryModeText: geometryModePresentation(inputs.profile.geometryMode).label,
    stationsText: `${profile.stations}`,
    equipmentCountText: `${inputs.equipment.length}`,
    constraintsText: constraintSummaryText(constraintStatus, evaluation.constraints.issues.length),
    constraintsStatus: equipmentConstraintUiStatus(constraintStatus),
    balanceText: balanceWarningCount > 0 ? `Experimental: предупреждений ${balanceWarningCount}` : "Experimental: equipment-only",
    balanceStatus: balanceWarningCount > 0 ? balanceSummaryUiStatus(true) : "experimental",
  });
}

export function renderWorkbenchSummary(elements: WorkbenchSummaryElements, inputs: ProjectInputs, evaluation: ProjectEvaluation): void {
  const viewModel = makeWorkbenchSummaryViewModel(inputs, evaluation);
  elements.dimensions.textContent = viewModel.dimensionsText;
  elements.geometryMode.textContent = viewModel.geometryModeText;
  elements.stations.textContent = viewModel.stationsText;
  elements.equipmentCount.textContent = viewModel.equipmentCountText;
  elements.constraints.textContent = viewModel.constraintsText;
  elements.balance.textContent = viewModel.balanceText;
  applySummaryStatus(elements.constraints, viewModel.constraintsStatus);
  applySummaryStatus(elements.balance, viewModel.balanceStatus);
}
