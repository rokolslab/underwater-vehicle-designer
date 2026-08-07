import type { EquipmentConstraintReport } from "../equipment/constraints";
import { equipmentIssues, equipmentStatus } from "../equipment/constraints";
import type { EquipmentItem, EquipmentShape } from "../equipment/model";
import { equipmentDisplacedVolume, equipmentVolume } from "../equipment/model";
import { formatNumber } from "../../shared/format";

function constraintIssueDescription(reason: string): string {
  if (reason === "invalidEquipment") return "Данные оборудования некорректны. Проверьте название, массу, размеры и положение.";
  if (reason === "outsideHull") return "Оборудование частично или полностью выходит за обводы корпуса.";
  if (reason === "outsideLength") return "Оборудование выходит за пределы длины корпуса.";
  if (reason === "intersects") return "Пересекается с другим оборудованием.";
  return "Обнаружена проблема компоновки оборудования.";
}

export interface InspectorViewModel {
  readonly isEmpty: boolean;
  readonly name?: string;
  readonly shape?: string;
  readonly massKg?: number;
  readonly positionX?: number;
  readonly positionY?: number;
  readonly positionZ?: number;
  readonly dimensions?: readonly { label: string; value: number }[];
  readonly displacedVolume?: number;
  readonly geometricVolume?: number;
  readonly status?: string;
  readonly statusType?: "normal" | "warning" | "error" | "experimental";
  readonly issues?: readonly string[];
}

function shapeLabel(shape: EquipmentShape): string {
  if (shape === "sphere") return "Сфера";
  if (shape === "cylinder") return "Цилиндр";
  return "Блок";
}

function shapeDimensions(item: EquipmentItem): readonly { label: string; value: number }[] {
  if (item.shape === "sphere") {
    return [{ label: "R, м", value: item.dimensions.radius }];
  }
  if (item.shape === "cylinder") {
    return [
      { label: "R, м", value: item.dimensions.radius },
      { label: "L, м", value: item.dimensions.length },
    ];
  }
  return [
    { label: "Lx, м", value: item.dimensions.lengthX },
    { label: "By, м", value: item.dimensions.breadthY },
    { label: "Hz, м", value: item.dimensions.heightZ },
  ];
}

function statusText(status: string): string {
  if (status === "ok") return "Норма";
  if (status === "outsideHull") return "Вне корпуса";
  if (status === "intersects") return "Пересечение";
  if (status === "invalidEquipment") return "Ошибка данных";
  return status;
}

export function makeInspectorViewModel(
  items: readonly EquipmentItem[],
  selectedId: string | null,
  report?: EquipmentConstraintReport,
): InspectorViewModel {
  if (!selectedId) {
    return { isEmpty: true };
  }

  const item = items.find((e) => e.id === selectedId);
  if (!item) {
    return { isEmpty: true };
  }

  const status = equipmentStatus(report, item.id);
  const issues = equipmentIssues(report, item.id);
  const dispVolume = equipmentDisplacedVolume(item);
  const geoVolume = equipmentVolume(item);

  return {
    isEmpty: false,
    name: item.name,
    shape: shapeLabel(item.shape),
    massKg: item.massKg,
    positionX: item.position.x,
    positionY: item.position.y,
    positionZ: item.position.z,
    dimensions: shapeDimensions(item),
    displacedVolume: dispVolume,
    geometricVolume: geoVolume,
    status: statusText(status),
    statusType: status === "ok" ? "normal" : status === "invalidEquipment" ? "error" : "warning",
    issues: issues.length > 0 ? issues.map((i) => constraintIssueDescription(i.reason)) : undefined,
  };
}

function renderInspectorContent(vm: InspectorViewModel): string {
  if (vm.isEmpty) {
    return '<p class="equipment-inspector-empty">Выберите оборудование для просмотра параметров</p>';
  }

  let html = '<div class="equipment-inspector-details">';
  html += `<h3 class="equipment-inspector-title">${escapeHtml(vm.name ?? "")}</h3>`;

  html += '<dl class="inspector-fields">';

  html += `<div class="inspector-field"><dt>Форма</dt><dd>${escapeHtml(vm.shape ?? "")}</dd></div>`;
  html += `<div class="inspector-field"><dt>Масса, кг</dt><dd>${formatNumber(vm.massKg ?? 0)}</dd></div>`;

  html += '<div class="inspector-field-group"><dt>Положение (Body/SNAME-NED)</dt><dd>';
  html += `<span>X: ${formatNumber(vm.positionX ?? 0)} м</span>`;
  html += `<span>Y: ${formatNumber(vm.positionY ?? 0)} м</span>`;
  html += `<span>Z: ${formatNumber(vm.positionZ ?? 0)} м</span>`;
  html += '</dd></div>';

  if (vm.dimensions && vm.dimensions.length > 0) {
    html += '<div class="inspector-field-group"><dt>Размеры</dt><dd>';
    for (const dim of vm.dimensions) {
      html += `<span>${escapeHtml(dim.label)}: ${formatNumber(dim.value)}</span>`;
    }
    html += '</dd></div>';
  }

  html += `<div class="inspector-field"><dt>Объём (геом.), м³</dt><dd>${formatNumber(vm.geometricVolume ?? 0, 4)}</dd></div>`;
  html += `<div class="inspector-field"><dt>Вытесненный объём, м³</dt><dd>${formatNumber(vm.displacedVolume ?? 0, 4)}</dd></div>`;

  const statusTypeClass = vm.statusType === "error" ? "ui-status--error" : vm.statusType === "warning" ? "ui-status--warning" : "ui-status--normal";
  html += `<div class="inspector-field"><dt>Статус</dt><dd class="${statusTypeClass}" data-ui-status="${vm.statusType ?? "normal"}">${escapeHtml(vm.status ?? "Норма")}</dd></div>`;

  if (vm.issues && vm.issues.length > 0) {
    html += '<div class="inspector-field-group"><dt>Проблемы</dt><dd>';
    for (const issue of vm.issues) {
      html += `<span class="inspector-issue">${escapeHtml(issue)}</span>`;
    }
    html += '</dd></div>';
    html += `<a class="inspector-navigate-btn" href="#diagnostics-queue">перейти к проблеме</a>`;
  }

  html += '</dl>';
  html += '</div>';

  return html;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function renderEquipmentInspector(
  container: HTMLElement,
  items: readonly EquipmentItem[],
  selectedId: string | null,
  report?: EquipmentConstraintReport,
): void {
  const vm = makeInspectorViewModel(items, selectedId, report);
  container.innerHTML = renderInspectorContent(vm);
}
