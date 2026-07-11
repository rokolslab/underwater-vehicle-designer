import type { EquipmentConstraintReport, EquipmentConstraintStatus } from "../equipment/constraints";
import { equipmentIssues, equipmentStatus } from "../equipment/constraints";
import type { EquipmentItem, EquipmentShape } from "../equipment/model";
import type { EquipmentUpdate } from "../equipment/placement";
import { logger } from "../../shared/logger";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function option(value: string, label: string, selected: boolean): string {
  return `<option value="${value}"${selected ? " selected" : ""}>${label}</option>`;
}

function statusLabel(status: EquipmentConstraintStatus): string {
  if (status === "outsideHull") return "Вне корпуса";
  if (status === "intersects") return "Пересечение";
  if (status === "invalidEquipment") return "Ошибка данных";
  return "Норма";
}

function statusClass(status: EquipmentConstraintStatus): string {
  return `equipment-row--${status}`;
}

function dimensionFields(item: EquipmentItem): string {
  if (item.shape === "sphere") {
    return `
      <label><span>Р</span><input data-field="radius" type="number" min="0.001" step="0.01" value="${item.dimensions.radius}" /></label>
      <label class="is-hidden"><span>Дл.</span><input data-field="length" type="number" min="0.001" step="0.01" value="" /></label>
      <label class="is-hidden"><span>Ш</span><input data-field="width" type="number" min="0.001" step="0.01" value="" /></label>
    `;
  }

  if (item.shape === "cylinder") {
    return `
      <label><span>Р</span><input data-field="radius" type="number" min="0.001" step="0.01" value="${item.dimensions.radius}" /></label>
      <label><span>Дл.</span><input data-field="length" type="number" min="0.001" step="0.01" value="${item.dimensions.length}" /></label>
      <label class="is-hidden"><span>Ш</span><input data-field="width" type="number" min="0.001" step="0.01" value="" /></label>
    `;
  }

  return `
    <label><span>Lx</span><input data-field="lengthX" type="number" min="0.001" step="0.01" value="${item.dimensions.lengthX}" /></label>
    <label><span>By</span><input data-field="breadthY" type="number" min="0.001" step="0.01" value="${item.dimensions.breadthY}" /></label>
    <label><span>Hz</span><input data-field="heightZ" type="number" min="0.001" step="0.01" value="${item.dimensions.heightZ}" /></label>
  `;
}

function renderIssueList(item: EquipmentItem, report: EquipmentConstraintReport | undefined): string {
  const issues = equipmentIssues(report, item.id);
  if (issues.length === 0) return "";

  return `<div class="equipment-issues" aria-label="Предупреждения по оборудованию">${issues
    .map((issue) => `<span>${escapeHtml(issue.message)}</span>`)
    .join("")}</div>`;
}

function renderStatus(item: EquipmentItem, report: EquipmentConstraintReport | undefined): string {
  const status = equipmentStatus(report, item.id);
  return `<div class="equipment-status equipment-status--${status}">${statusLabel(status)}</div>`;
}

function renderItem(item: EquipmentItem, report: EquipmentConstraintReport | undefined): string {
  const status = equipmentStatus(report, item.id);
  return `
    <div class="equipment-row ${statusClass(status)}" data-equipment-id="${escapeHtml(item.id)}">
      <label><span>Наименование</span><input data-field="name" type="text" value="${escapeHtml(item.name)}" /></label>
      <label>
        <span>Форма</span>
        <select data-field="shape">
          ${option("sphere", "Сфера", item.shape === "sphere")}
          ${option("cylinder", "Цилиндр", item.shape === "cylinder")}
          ${option("box", "Блок", item.shape === "box")}
        </select>
      </label>
      <label><span>Масса</span><input data-field="massKg" type="number" min="0.001" step="0.1" value="${item.massKg}" /></label>
      <label><span>X</span><input data-field="x" type="number" step="0.1" value="${item.position.x}" /></label>
      <label><span>Y</span><input data-field="y" type="number" step="0.1" value="${item.position.y}" /></label>
      <label><span>Z</span><input data-field="z" type="number" step="0.1" value="${item.position.z}" /></label>
      <label>
        <span>Ось</span>
        <select data-field="orientation">
          ${option("x", "X", item.orientation === "x")}
          ${option("y", "Y", item.orientation === "y")}
          ${option("z", "Z", item.orientation === "z")}
        </select>
      </label>
      ${dimensionFields(item)}
      ${renderStatus(item, report)}
      <button class="equipment-delete" data-action="delete-equipment" type="button" aria-label="Удалить ${escapeHtml(item.name)}">×</button>
      ${renderIssueList(item, report)}
    </div>
  `;
}

function renderSummary(report: EquipmentConstraintReport | undefined): string {
  const issueCount = report?.issues.length ?? 0;
  if (issueCount === 0) return "";
  return `<div class="equipment-warning-summary">Проблемы компоновки: ${issueCount}. Проверьте строки с предупреждениями.</div>`;
}

export function renderEquipmentEditor(
  container: HTMLElement,
  items: readonly EquipmentItem[],
  report?: EquipmentConstraintReport,
): void {
  logger.debug("equipment editor render started", { count: items.length, issueCount: report?.issues.length ?? 0 });
  container.innerHTML = items.length
    ? `${renderSummary(report)}${items.map((item) => renderItem(item, report)).join("")}`
    : '<div class="equipment-empty">Список пуст</div>';
  logger.debug("equipment editor render completed", { count: items.length, issueCount: report?.issues.length ?? 0 });
}

export function equipmentIdFromEvent(event: Event): string | null {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLElement>("[data-equipment-id]")?.dataset.equipmentId ?? null;
}

export function isEquipmentDeleteEvent(event: Event): boolean {
  const target = event.target;
  return target instanceof HTMLElement && Boolean(target.closest("[data-action='delete-equipment']"));
}

function rowValue(row: HTMLElement, field: string): string | undefined {
  const element = row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-field="${field}"]`);
  return element?.value;
}

export interface ReadEquipmentUpdateOptions {
  readonly includeDimensions?: boolean;
}

function readDimensions(row: HTMLElement, shape: EquipmentShape): EquipmentUpdate["dimensions"] {
  if (shape === "sphere") return { radius: Number(rowValue(row, "radius")) };
  if (shape === "cylinder") {
    return {
      radius: Number(rowValue(row, "radius")),
      length: Number(rowValue(row, "length")),
    };
  }

  return {
    lengthX: Number(rowValue(row, "lengthX")),
    breadthY: Number(rowValue(row, "breadthY")),
    heightZ: Number(rowValue(row, "heightZ")),
  };
}

export function readEquipmentUpdate(row: HTMLElement, options: ReadEquipmentUpdateOptions = {}): EquipmentUpdate {
  const shape = rowValue(row, "shape") as EquipmentShape;
  const update: EquipmentUpdate = {
    name: rowValue(row, "name"),
    shape,
    massKg: Number(rowValue(row, "massKg")),
    position: {
      x: Number(rowValue(row, "x")),
      y: Number(rowValue(row, "y")),
      z: Number(rowValue(row, "z")),
    },
    orientation: rowValue(row, "orientation") as EquipmentUpdate["orientation"],
    ...((options.includeDimensions ?? true) ? { dimensions: readDimensions(row, shape) } : {}),
  };

  logger.debug("equipment update read from row", { shape, changedFields: Object.keys(update) });
  return update;
}
