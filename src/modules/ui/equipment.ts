import type { EquipmentConstraintReport, EquipmentConstraintStatus } from "../equipment/constraints";
import { equipmentIssues, equipmentStatus } from "../equipment/constraints";
import type { EquipmentItem, EquipmentShape } from "../equipment/model";
import type { EquipmentUpdate } from "../equipment/placement";
import { logger } from "../../shared/logger";
import { equipmentConstraintUiStatus, uiStatusClassName, uiStatusHtmlAttributes } from "./statusTokens";

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

export interface EquipmentAccessibilityIds {
  readonly row: string;
  readonly nameLabel: string;
  readonly status: string;
  readonly issues: string;
}

function safeEquipmentIdStem(equipmentId: string, index: number): string {
  const encodedId = Array.from(equipmentId)
    .map((character) => character.codePointAt(0)?.toString(16).padStart(2, "0"))
    .join("-");
  return `equipment-${index}-${encodedId || "empty"}`;
}

export function makeEquipmentAccessibilityIds(equipmentId: string, index: number): EquipmentAccessibilityIds {
  const stem = safeEquipmentIdStem(equipmentId, index);
  return Object.freeze({
    row: `${stem}-row`,
    nameLabel: `${stem}-name-label`,
    status: `${stem}-status`,
    issues: `${stem}-issues`,
  });
}

function dimensionFields(item: EquipmentItem): string {
  if (item.shape === "sphere") {
    return `
      <label title="Радиус сферы, м"><span>R, м</span><input data-field="radius" type="number" inputmode="decimal" min="0.001" step="0.01" value="${item.dimensions.radius}" /></label>
      <label class="is-hidden"><span>Дл.</span><input data-field="length" type="number" inputmode="decimal" min="0.001" step="0.01" value="" /></label>
      <label class="is-hidden"><span>Ш</span><input data-field="width" type="number" inputmode="decimal" min="0.001" step="0.01" value="" /></label>
    `;
  }

  if (item.shape === "cylinder") {
    return `
      <label title="Радиус цилиндра, м"><span>R, м</span><input data-field="radius" type="number" inputmode="decimal" min="0.001" step="0.01" value="${item.dimensions.radius}" /></label>
      <label title="Длина цилиндра вдоль выбранной оси, м"><span>Длина, м</span><input data-field="length" type="number" inputmode="decimal" min="0.001" step="0.01" value="${item.dimensions.length}" /></label>
      <label class="is-hidden"><span>Ш</span><input data-field="width" type="number" inputmode="decimal" min="0.001" step="0.01" value="" /></label>
    `;
  }

  return `
    <label title="Длина блока по оси X, м"><span>Lx, м</span><input data-field="lengthX" type="number" inputmode="decimal" min="0.001" step="0.01" value="${item.dimensions.lengthX}" /></label>
    <label title="Ширина блока по оси Y, м"><span>By, м</span><input data-field="breadthY" type="number" inputmode="decimal" min="0.001" step="0.01" value="${item.dimensions.breadthY}" /></label>
    <label title="Высота блока по оси Z, м"><span>Hz, м</span><input data-field="heightZ" type="number" inputmode="decimal" min="0.001" step="0.01" value="${item.dimensions.heightZ}" /></label>
  `;
}

function renderIssueList(issues: ReturnType<typeof equipmentIssues>, issuesId: string): string {
  if (issues.length === 0) return "";

  return `<div id="${issuesId}" class="equipment-issues" aria-label="Предупреждения по оборудованию">${issues
    .map((issue) => `<span>${escapeHtml(issue.message)}</span>`)
    .join("")}</div>`;
}

function renderStatus(item: EquipmentItem, report: EquipmentConstraintReport | undefined, statusId: string): string {
  const status = equipmentStatus(report, item.id);
  const semanticStatus = equipmentConstraintUiStatus(status);
  return `<div id="${statusId}" class="equipment-status equipment-status--${status} ${uiStatusClassName(semanticStatus)}" ${uiStatusHtmlAttributes(semanticStatus)}>${statusLabel(status)}</div>`;
}

function renderItem(item: EquipmentItem, report: EquipmentConstraintReport | undefined, index: number): string {
  const status = equipmentStatus(report, item.id);
  const semanticStatus = equipmentConstraintUiStatus(status);
  const accessibilityIds = makeEquipmentAccessibilityIds(item.id, index);
  const issues = equipmentIssues(report, item.id);
  const describedBy = [accessibilityIds.status, ...(issues.length > 0 ? [accessibilityIds.issues] : [])].join(" ");
  return `
    <div id="${accessibilityIds.row}" class="equipment-row ${statusClass(status)} ${uiStatusClassName(semanticStatus)}" data-equipment-id="${escapeHtml(item.id)}" ${uiStatusHtmlAttributes(semanticStatus)} aria-labelledby="${accessibilityIds.nameLabel}" aria-describedby="${describedBy}">
      <label><span id="${accessibilityIds.nameLabel}">Наименование</span><input data-field="name" type="text" value="${escapeHtml(item.name)}" /></label>
      <label>
        <span>Форма</span>
        <select data-field="shape">
          ${option("sphere", "Сфера", item.shape === "sphere")}
          ${option("cylinder", "Цилиндр", item.shape === "cylinder")}
          ${option("box", "Блок", item.shape === "box")}
        </select>
      </label>
      <label><span>Масса, кг</span><input data-field="massKg" type="number" inputmode="decimal" min="0.001" step="0.1" value="${item.massKg}" /></label>
      <label title="Body X, положительное направление — к носу"><span>X, м → нос</span><input data-field="x" type="number" inputmode="decimal" step="0.1" value="${item.position.x}" /></label>
      <label title="Body Y, положительное направление — на правый борт"><span>Y, м → правый борт</span><input data-field="y" type="number" inputmode="decimal" step="0.1" value="${item.position.y}" /></label>
      <label title="Body Z, положительное направление — вниз"><span>Z, м → вниз</span><input data-field="z" type="number" inputmode="decimal" step="0.1" value="${item.position.z}" /></label>
      <label>
        <span title="Продольная ось цилиндра в Body/SNAME-NED">Ось цилиндра</span>
        <select data-field="orientation">
          ${option("x", "X — нос", item.orientation === "x")}
          ${option("y", "Y — правый борт", item.orientation === "y")}
          ${option("z", "Z — вниз", item.orientation === "z")}
        </select>
      </label>
      ${dimensionFields(item)}
      ${renderStatus(item, report, accessibilityIds.status)}
      <button class="equipment-delete" data-action="delete-equipment" type="button" aria-label="Удалить ${escapeHtml(item.name)}">×</button>
      ${renderIssueList(issues, accessibilityIds.issues)}
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
    ? `${renderSummary(report)}${items.map((item, index) => renderItem(item, report, index)).join("")}`
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
