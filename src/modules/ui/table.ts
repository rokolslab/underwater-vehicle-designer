import type { ProfileSnapshot } from "../geometry/model";
import { formatNumber } from "../../shared/format";

export function renderTable(tableBody: HTMLTableSectionElement, pointCountEl: HTMLElement, snapshot: ProfileSnapshot): void {
  tableBody.innerHTML = snapshot.stationPoints
    .map(
      (point, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${formatNumber(point.x, 4)}</td>
          <td>${formatNumber(point.yTop, 4)}</td>
          <td>${formatNumber(point.yBottom, 4)}</td>
        </tr>
      `,
    )
    .join("");
  pointCountEl.textContent = `${snapshot.stationPoints.length} точек`;
}
