import type { ProfileSnapshot } from "../geometry/model";
import { formatNumber } from "../../shared/format";

export interface MetricsElements {
  readonly maxRadius: HTMLElement;
  readonly maxHeight: HTMLElement;
  readonly maxX: HTMLElement;
}

export function renderMetrics(elements: MetricsElements, snapshot: ProfileSnapshot): void {
  elements.maxRadius.textContent = formatNumber(snapshot.extents.maxRadius, 4);
  elements.maxHeight.textContent = formatNumber(snapshot.extents.maxHeight, 4);
  elements.maxX.textContent = formatNumber(snapshot.extents.maxX, 4);
}
