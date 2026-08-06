import type { BodyVector3 } from "../../shared/body-coordinates";
import type { EquipmentBalanceResult, BalanceWarningCode } from "../balance/model";
import type { ProfileSnapshot } from "../geometry/model";
import { formatNumber } from "../../shared/format";
import { logger } from "../../shared/logger";
import { UI_STATUS_CLASS_NAMES, UI_STATUS_DATA_ATTRIBUTE, balanceSummaryUiStatus, uiStatusClassName, uiStatusDataValue } from "./statusTokens";

export interface MetricsElements {
  readonly maxRadius: HTMLElement;
  readonly maxHeight: HTMLElement;
  readonly totalLength: HTMLElement;
  readonly cylindricalInsertLength: HTMLElement;
}

export interface BalanceMetricsElements {
  readonly totalMass: HTMLElement;
  readonly displacedVolume: HTMLElement;
  readonly weight: HTMLElement;
  readonly buoyancyForce: HTMLElement;
  readonly netBuoyancy: HTMLElement;
  readonly centerOfGravity: HTMLElement;
  readonly centerOfBuoyancy: HTMLElement;
  readonly momentArm: HTMLElement;
  readonly deltaX: HTMLElement;
  readonly deltaY: HTMLElement;
  readonly bg: HTMLElement;
  readonly warnings: HTMLElement;
}

const warningLabels: Record<BalanceWarningCode, string> = {
  emptyEquipment: "Нет оборудования для расчета баланса.",
  invalidEquipment: "Есть оборудование с некорректными данными.",
  invalidWaterDensity: "Плотность воды должна быть положительным числом.",
  invalidGravity: "Ускорение свободного падения должно быть положительным числом.",
  equipmentOnlyBuoyancyModel: "ЦВ рассчитан только по вытесненным объёмам оборудования и не является ЦВ внешнего герметичного корпуса.",
  nonPositiveBuoyancy: "Плавучесть нулевая или отрицательная.",
  unstableVerticalCenters: "ЦВ не выше ЦТ по вертикали.",
  longitudinalCentersMisaligned: "Продольное смещение ЦВ и ЦТ превышает допуск.",
  transverseCentersMisaligned: "Поперечное смещение ЦВ и ЦТ превышает допуск.",
};

export function renderMetrics(elements: MetricsElements, snapshot: ProfileSnapshot): void {
  elements.maxRadius.textContent = formatNumber(snapshot.extents.maxRadius, 4);
  elements.maxHeight.textContent = formatNumber(snapshot.extents.maxHeight, 4);
  elements.totalLength.textContent = formatNumber(snapshot.extents.totalLength, 4);
  elements.cylindricalInsertLength.textContent = formatNumber(snapshot.state.cylindricalInsertLength, 4);
}

function formatVector(vector: BodyVector3): string {
  return `X ${formatNumber(vector.x, 3)} м; Y ${formatNumber(vector.y, 3)} м; Z ${formatNumber(vector.z, 3)} м`;
}

function warningText(result: EquipmentBalanceResult): string {
  if (result.warnings.length === 0) return "Норма";
  return result.warnings.map((warning) => warningLabels[warning.code]).join(" ");
}

export function renderBalanceMetrics(elements: BalanceMetricsElements, result: EquipmentBalanceResult): void {
  logger.debug("balance metrics render started", { isValid: result.isValid, warningCount: result.warnings.length });
  const warningStatus = balanceSummaryUiStatus(result.warnings.length > 0);
  elements.totalMass.textContent = formatNumber(result.totalMassKg, 3);
  elements.displacedVolume.textContent = formatNumber(result.displacedVolumeM3, 4);
  elements.weight.textContent = formatNumber(result.weightN, 1);
  elements.buoyancyForce.textContent = formatNumber(result.buoyancyForceN, 1);
  elements.netBuoyancy.textContent = formatNumber(result.netBuoyancyN, 1);
  elements.centerOfGravity.textContent = formatVector(result.centerOfGravity);
  elements.centerOfBuoyancy.textContent = formatVector(result.centerOfBuoyancy);
  elements.momentArm.textContent = formatVector(result.momentArm);
  elements.deltaX.textContent = `${formatNumber(result.deltaX, 3)} м`;
  elements.deltaY.textContent = `${formatNumber(result.deltaY, 3)} м`;
  elements.bg.textContent = `${formatNumber(result.bgM, 3)} м`;
  elements.warnings.textContent = warningText(result);
  elements.warnings.classList.toggle("balance-warning-summary--ok", result.warnings.length === 0);
  elements.warnings.classList.remove(...UI_STATUS_CLASS_NAMES);
  elements.warnings.classList.add(uiStatusClassName(warningStatus));
  elements.warnings.setAttribute(UI_STATUS_DATA_ATTRIBUTE, uiStatusDataValue(warningStatus));
  logger.debug("balance metrics render completed", { isValid: result.isValid, warningCount: result.warnings.length });
}
