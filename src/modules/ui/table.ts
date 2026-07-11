import type { ProfileSnapshot } from "../geometry/model";
import { formatNumber } from "../../shared/format";

export function renderTable(tableBody: HTMLTableSectionElement, pointCountEl: HTMLElement, snapshot: ProfileSnapshot): void {
  tableBody.innerHTML = snapshot.stationPoints
    .map(
      (point, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${formatNumber(point.s, 4)}</td>
          <td>${formatNumber(point.topRadius, 4)}</td>
          <td>${formatNumber(point.bottomRadius, 4)}</td>
        </tr>
      `,
    )
    .join("");
  pointCountEl.textContent = `${snapshot.stationPoints.length} точек`;
}
