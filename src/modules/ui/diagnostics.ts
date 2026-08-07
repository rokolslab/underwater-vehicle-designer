import type { EquipmentConstraintReport, EquipmentConstraintReason } from "../equipment/constraints";
import type { EquipmentItem } from "../equipment/model";
import type { EquipmentBalanceResult } from "../balance/model";
import { warningLabels } from "./metrics";

export interface DiagnosticEntry {
  readonly id: string;
  readonly severity: "error" | "warning" | "info";
  readonly source: "constraint" | "balance";
  readonly targetKind: "equipment" | "balanceGlobal";
  readonly equipmentId?: string;
  readonly safeAnchorId: string;
  readonly title: string;
  readonly description: string;
}

export interface DiagnosticsViewModel {
  readonly entries: readonly DiagnosticEntry[];
  readonly isEmpty: boolean;
  readonly emptyReason: string | null;
}

function constraintSeverity(reason: EquipmentConstraintReason): "error" | "warning" {
  if (reason === "invalidEquipment") return "error";
  if (reason === "outsideLength") return "error";
  return "warning";
}

function constraintTitle(reason: EquipmentConstraintReason): string {
  if (reason === "invalidEquipment") return "Некорректные данные оборудования";
  if (reason === "outsideHull") return "Оборудование вне корпуса";
  if (reason === "outsideLength") return "Оборудование за пределами длины корпуса";
  if (reason === "intersects") return "Пересечение оборудования";
  return reason;
}

function severityRank(severity: "error" | "warning" | "info"): number {
  if (severity === "error") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function sourceRank(source: "constraint" | "balance"): number {
  return source === "constraint" ? 0 : 1;
}

export function makeDiagnosticsViewModel(
  items: readonly EquipmentItem[],
  report?: EquipmentConstraintReport,
  balance?: EquipmentBalanceResult,
): DiagnosticsViewModel {
  if (items.length === 0) {
    return {
      entries: [],
      isEmpty: true,
      emptyReason: "Добавьте оборудование, чтобы увидеть диагностику компоновки",
    };
  }

  const constraintIssueIds = new Set<string>();
  const entries: DiagnosticEntry[] = [];
  const equipmentIndexMap = new Map(items.map((item, idx) => [item.id, idx]));

  for (const issue of report?.issues ?? []) {
    const entryId = `diag-constraint-${issue.reason}-${issue.equipmentId}`;
    constraintIssueIds.add(entryId);
    if (issue.reason === "invalidEquipment") {
      constraintIssueIds.add(issue.equipmentId);
    }
    entries.push({
      id: entryId,
      severity: constraintSeverity(issue.reason),
      source: "constraint",
      targetKind: "equipment",
      equipmentId: issue.equipmentId,
      safeAnchorId: `diag-${entryId}`,
      title: constraintTitle(issue.reason),
      description: issue.message,
    });
  }

  const invalidEquipmentIds = new Set(
    (report?.issues ?? [])
      .filter((issue) => issue.reason === "invalidEquipment")
      .map((issue) => issue.equipmentId),
  );

  for (const warning of balance?.warnings ?? []) {
    if (warning.code === "equipmentOnlyBuoyancyModel") continue;

    if (warning.code === "invalidEquipment" && warning.equipmentId && invalidEquipmentIds.has(warning.equipmentId)) {
      continue;
    }

    entries.push({
      id: `diag-balance-${warning.code}${warning.equipmentId ? `-${warning.equipmentId}` : ""}`,
      severity: warning.code === "invalidEquipment" ? "error" : "warning",
      source: "balance",
      targetKind: warning.equipmentId ? "equipment" : "balanceGlobal",
      equipmentId: warning.equipmentId,
      safeAnchorId: `diag-balance-${warning.code}${warning.equipmentId ? `-${warning.equipmentId}` : ""}`,
      title: warningLabels[warning.code] ?? warning.message,
      description: warning.message,
    });
  }

  entries.sort((a, b) => {
    const sevDiff = severityRank(a.severity) - severityRank(b.severity);
    if (sevDiff !== 0) return sevDiff;

    const srcDiff = sourceRank(a.source) - sourceRank(b.source);
    if (srcDiff !== 0) return srcDiff;

    if (a.equipmentId && b.equipmentId) {
      const idxA = equipmentIndexMap.get(a.equipmentId) ?? 999;
      const idxB = equipmentIndexMap.get(b.equipmentId) ?? 999;
      if (idxA !== idxB) return idxA - idxB;
    }

    if (a.source === "constraint" && b.source === "constraint") {
      return 0;
    }

    return a.id.localeCompare(b.id);
  });

  if (entries.length === 0) {
    return {
      entries: [],
      isEmpty: true,
      emptyReason: null,
    };
  }

  return {
    entries: Object.freeze([...entries]),
    isEmpty: false,
    emptyReason: null,
  };
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function renderDiagnostics(
  queueContainer: HTMLElement,
  emptyContainer: HTMLElement,
  vm: DiagnosticsViewModel,
): void {
  if (vm.isEmpty) {
    queueContainer.innerHTML = "";
    emptyContainer.classList.toggle("is-hidden", !vm.emptyReason);
    if (vm.emptyReason) {
      emptyContainer.textContent = vm.emptyReason;
    }
    return;
  }

  emptyContainer.classList.add("is-hidden");
  let html = "";
  for (const entry of vm.entries) {
    const severityClass = entry.severity === "error" ? "diagnostics-entry--error" : entry.severity === "warning" ? "diagnostics-entry--warning" : "diagnostics-entry--info";
    const targetData = entry.targetKind === "equipment" && entry.equipmentId
      ? ` data-diagnostics-target="${escapeHtml(entry.equipmentId)}"`
      : "";
    html += `<div class="diagnostics-entry ${severityClass}" id="${escapeHtml(entry.safeAnchorId)}"${targetData} tabindex="0" role="button">
      <span class="diagnostics-entry-severity">${entry.severity === "error" ? "Ошибка" : entry.severity === "warning" ? "Предупреждение" : "Инфо"}</span>
      <span class="diagnostics-entry-title">${escapeHtml(entry.title)}</span>
      <span class="diagnostics-entry-description">${escapeHtml(entry.description)}</span>
    </div>`;
  }
  queueContainer.innerHTML = html;
}
