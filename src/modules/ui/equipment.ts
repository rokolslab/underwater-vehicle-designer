import type { EquipmentItem, EquipmentShape } from "../equipment/model";
import type { EquipmentUpdate } from "../equipment/placement";
import { logger } from "../../shared/logger";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function option(value: string, label: string, selected: boolean): string {
  return `<option value="${value}"${selected ? " selected" : ""}>${label}</option>`;
}

function dimensionFields(item: EquipmentItem): string {
  if (item.shape === "sphere") {
    return `
      <label><span>R</span><input data-field="radius" type="number" min="0.001" step="0.01" value="${item.dimensions.radius}" /></label>
      <label class="is-hidden"><span>L</span><input data-field="length" type="number" min="0.001" step="0.01" value="" /></label>
      <label class="is-hidden"><span>W</span><input data-field="width" type="number" min="0.001" step="0.01" value="" /></label>
    `;
  }

  if (item.shape === "cylinder") {
    return `
      <label><span>R</span><input data-field="radius" type="number" min="0.001" step="0.01" value="${item.dimensions.radius}" /></label>
      <label><span>L</span><input data-field="length" type="number" min="0.001" step="0.01" value="${item.dimensions.length}" /></label>
      <label class="is-hidden"><span>W</span><input data-field="width" type="number" min="0.001" step="0.01" value="" /></label>
    `;
  }

  return `
    <label><span>W</span><input data-field="width" type="number" min="0.001" step="0.01" value="${item.dimensions.width}" /></label>
    <label><span>H</span><input data-field="height" type="number" min="0.001" step="0.01" value="${item.dimensions.height}" /></label>
    <label><span>D</span><input data-field="depth" type="number" min="0.001" step="0.01" value="${item.dimensions.depth}" /></label>
  `;
}

function renderItem(item: EquipmentItem): string {
  return `
    <div class="equipment-row" data-equipment-id="${escapeHtml(item.id)}">
      <label><span>Имя</span><input data-field="name" type="text" value="${escapeHtml(item.name)}" /></label>
      <label>
        <span>Shape</span>
        <select data-field="shape">
          ${option("sphere", "Sphere", item.shape === "sphere")}
          ${option("cylinder", "Cylinder", item.shape === "cylinder")}
          ${option("box", "Box", item.shape === "box")}
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
      <button class="equipment-delete" data-action="delete-equipment" type="button" aria-label="Удалить ${escapeHtml(item.name)}">×</button>
    </div>
  `;
}

export function renderEquipmentEditor(container: HTMLElement, items: readonly EquipmentItem[]): void {
  logger.debug("equipment editor render started", { count: items.length });
  container.innerHTML = items.length
    ? items.map(renderItem).join("")
    : '<div class="equipment-empty">Список пуст</div>';
  logger.debug("equipment editor render completed", { count: items.length });
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
    width: Number(rowValue(row, "width")),
    height: Number(rowValue(row, "height")),
    depth: Number(rowValue(row, "depth")),
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
