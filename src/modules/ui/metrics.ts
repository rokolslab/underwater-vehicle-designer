import type { HullBuoyancyResult } from "../balance/model";
import type { ProfileSnapshot } from "../geometry/model";
import { formatNumber } from "../../shared/format";

export interface MetricsElements {
  readonly maxRadius: HTMLElement;
  readonly maxHeight: HTMLElement;
  readonly maxX: HTMLElement;
  readonly hullVolume: HTMLElement;
  readonly hullCenterX: HTMLElement;
}

export function renderMetrics(
  elements: MetricsElements,
  snapshot: ProfileSnapshot,
  hullBuoyancy: HullBuoyancyResult,
): void {
  elements.maxRadius.textContent = formatNumber(snapshot.extents.maxRadius, 4);
  elements.maxHeight.textContent = formatNumber(snapshot.extents.maxHeight, 4);
  elements.maxX.textContent = formatNumber(snapshot.extents.maxX, 4);
  elements.hullVolume.textContent = formatNumber(hullBuoyancy.isValid ? hullBuoyancy.displacedVolume : 0, 4);
  elements.hullCenterX.textContent = formatNumber(hullBuoyancy.isValid ? hullBuoyancy.center.x : 0, 4);
}
