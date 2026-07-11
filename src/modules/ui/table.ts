import type { ProfileSnapshot } from "../geometry/model";
import { formatNumber } from "../../shared/format";

export function renderTable(tableBody: HTMLTableSectionElement, pointCountEl: HTMLElement, snapshot: ProfileSnapshot): void {
  tableBody.innerHTML = snapshot.stationPoints
    .map(
      (station, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${formatNumber(station.s, 4)}</td>
          <td>${formatNumber(station.topRadius, 4)}</td>
          <td>${formatNumber(station.bottomRadius, 4)}</td>
        </tr>
      `,
    )
    .join("");
  pointCountEl.textContent = `${snapshot.stationPoints.length} параметрических станций`;
}
