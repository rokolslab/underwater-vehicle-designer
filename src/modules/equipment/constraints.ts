import { profileRadiusAt } from "../geometry/profile";
import type { ProfileSnapshot } from "../geometry/model";
import { profileSFromBodyX } from "../../shared/body-coordinates";
import type { BodyPoint3 } from "../../shared/body-coordinates";
import type { EquipmentItem } from "./model";
import { validateEquipmentItem } from "./model";
import { logger } from "../../shared/logger";

export type EquipmentConstraintStatus = "ok" | "outsideHull" | "intersects" | "invalidEquipment";
export type EquipmentConstraintReason = "outsideHull" | "outsideLength" | "intersects" | "invalidEquipment";

export interface EquipmentConstraintIssue {
  readonly equipmentId: string;
  readonly reason: EquipmentConstraintReason;
  readonly message: string;
  readonly status: EquipmentConstraintStatus;
  readonly otherEquipmentId?: string;
}

export interface EquipmentConstraintReport {
  readonly issues: readonly EquipmentConstraintIssue[];
  readonly issuesById: ReadonlyMap<string, readonly EquipmentConstraintIssue[]>;
  readonly statusById: ReadonlyMap<string, EquipmentConstraintStatus>;
}

interface AxisExtents {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface Aabb {
  readonly min: BodyPoint3;
  readonly max: BodyPoint3;
}

interface ContainmentSample {
  readonly bodyX: number;
  readonly stationS: number;
  readonly radialOffset: number;
  readonly localRadius: number;
}

const statusSeverity: Record<EquipmentConstraintStatus, number> = {
  ok: 0,
  intersects: 1,
  outsideHull: 2,
  invalidEquipment: 3,
};

function freezeIssues(issues: EquipmentConstraintIssue[]): readonly EquipmentConstraintIssue[] {
  return Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
}

function emptyReport(items: readonly EquipmentItem[]): EquipmentConstraintReport {
  return Object.freeze({
    issues: Object.freeze([]),
    issuesById: Object.freeze(new Map<string, readonly EquipmentConstraintIssue[]>()),
    statusById: Object.freeze(new Map(items.map((item) => [item.id, "ok" as EquipmentConstraintStatus]))),
  });
}

function moreSevereStatus(
  current: EquipmentConstraintStatus,
  candidate: EquipmentConstraintStatus,
): EquipmentConstraintStatus {
  return statusSeverity[candidate] > statusSeverity[current] ? candidate : current;
}

function statusForReason(reason: EquipmentConstraintReason): EquipmentConstraintStatus {
  if (reason === "invalidEquipment") return "invalidEquipment";
  if (reason === "intersects") return "intersects";
  return "outsideHull";
}

function makeIssue(
  equipmentId: string,
  reason: EquipmentConstraintReason,
  message: string,
  otherEquipmentId?: string,
): EquipmentConstraintIssue {
  return Object.freeze({
    equipmentId,
    reason,
    message,
    status: statusForReason(reason),
    ...(otherEquipmentId ? { otherEquipmentId } : {}),
  });
}

function buildReport(items: readonly EquipmentItem[], issues: readonly EquipmentConstraintIssue[]): EquipmentConstraintReport {
  const mutableIssuesById = new Map<string, EquipmentConstraintIssue[]>();
  const mutableStatusById = new Map<string, EquipmentConstraintStatus>();

  for (const item of items) {
    mutableIssuesById.set(item.id, []);
    mutableStatusById.set(item.id, "ok");
  }

  for (const issue of issues) {
    const list = mutableIssuesById.get(issue.equipmentId) ?? [];
    list.push(issue);
    mutableIssuesById.set(issue.equipmentId, list);
    mutableStatusById.set(
      issue.equipmentId,
      moreSevereStatus(mutableStatusById.get(issue.equipmentId) ?? "ok", issue.status),
    );
  }

  const issuesById = new Map<string, readonly EquipmentConstraintIssue[]>();
  for (const [equipmentId, itemIssues] of mutableIssuesById) {
    issuesById.set(equipmentId, freezeIssues(itemIssues));
  }

  return Object.freeze({
    issues: freezeIssues([...issues]),
    issuesById: Object.freeze(issuesById),
    statusById: Object.freeze(new Map(mutableStatusById)),
  });
}


function itemAxisExtents(item: EquipmentItem): AxisExtents | null {
  if (item.shape === "sphere") {
    return Object.freeze({
      x: item.dimensions.radius,
      y: item.dimensions.radius,
      z: item.dimensions.radius,
    });
  }

  if (item.shape === "cylinder") {
    const halfLength = item.dimensions.length / 2;
    return Object.freeze({
      x: item.orientation === "x" ? halfLength : item.dimensions.radius,
      y: item.orientation === "y" ? halfLength : item.dimensions.radius,
      z: item.orientation === "z" ? halfLength : item.dimensions.radius,
    });
  }

  return Object.freeze({
    x: item.dimensions.lengthX / 2,
    y: item.dimensions.breadthY / 2,
    z: item.dimensions.heightZ / 2,
  });
}

function itemAabb(item: EquipmentItem): Aabb | null {
  const extents = itemAxisExtents(item);
  if (!extents) return null;

  return Object.freeze({
    min: Object.freeze({
      x: item.position.x - extents.x,
      y: item.position.y - extents.y,
      z: item.position.z - extents.z,
    }),
    max: Object.freeze({
      x: item.position.x + extents.x,
      y: item.position.y + extents.y,
      z: item.position.z + extents.z,
    }),
  });
}

function controlXs(item: EquipmentItem, extents: AxisExtents): readonly number[] {
  if (item.shape === "sphere") {
    return Object.freeze([item.position.x - extents.x, item.position.x, item.position.x + extents.x]);
  }

  const halfX = extents.x;
  return Object.freeze([
    item.position.x - halfX,
    item.position.x - halfX / 2,
    item.position.x,
    item.position.x + halfX / 2,
    item.position.x + halfX,
  ]);
}

function containmentSample(item: EquipmentItem, extents: AxisExtents, bodyX: number, length: number): ContainmentSample {
  const radialOffset = Math.hypot(item.position.y, item.position.z);
  const stationS = profileSFromBodyX(bodyX, length);

  if (item.shape === "sphere") {
    const dx = Math.abs(bodyX - item.position.x);
    const localRadius = Math.sqrt(Math.max(0, item.dimensions.radius ** 2 - dx ** 2));
    return Object.freeze({ bodyX, stationS, radialOffset, localRadius });
  }

  return Object.freeze({
    bodyX,
    stationS,
    radialOffset,
    localRadius: Math.hypot(extents.y, extents.z),
  });
}

function evaluateContainment(snapshot: ProfileSnapshot, item: EquipmentItem): readonly EquipmentConstraintIssue[] {
  const extents = itemAxisExtents(item);
  if (!extents) {
    return Object.freeze([
      makeIssue(item.id, "invalidEquipment", "Невозможно проверить габариты оборудования внутри корпуса."),
    ]);
  }

  const totalLength = snapshot.extents.totalLength;
  const bodyMinX = -totalLength / 2;
  const bodyMaxX = totalLength / 2;
  const minX = item.position.x - extents.x;
  const maxX = item.position.x + extents.x;
  const issues: EquipmentConstraintIssue[] = [];

  logger.debug("equipment body bounds resolved", {
    id: item.id,
    shape: item.shape,
    bodyPosition: item.position,
    bodyBounds: { minX, maxX },
    hullBodyBounds: { minX: bodyMinX, maxX: bodyMaxX },
  });

  if (minX < bodyMinX || maxX > bodyMaxX) {
    logger.warn("equipment outside length bounds", {
      id: item.id,
      shape: item.shape,
      bodyX: item.position.x,
      bodyY: item.position.y,
      bodyZ: item.position.z,
      minX,
      maxX,
      bodyMinX,
      bodyMaxX,
    });
    issues.push(
      makeIssue(item.id, "outsideLength", `Оборудование выходит за длину корпуса: ${minX.toFixed(2)}..${maxX.toFixed(2)} м.`),
    );
  }

  for (const x of controlXs(item, extents)) {
    const sample = containmentSample(item, extents, x, snapshot.state.length);
    const requiredRadius = sample.radialOffset + sample.localRadius;
    const hullRadius =
      x < bodyMinX || x > bodyMaxX
        ? 0
        : profileRadiusAt(
            sample.stationS,
            snapshot.state.length,
            snapshot.state.diameter,
            snapshot.state.cylindricalInsertLength,
          );

    if (requiredRadius > hullRadius) {
      logger.warn("equipment outside hull radius", {
        id: item.id,
        shape: item.shape,
        bodyX: sample.bodyX,
        bodyY: item.position.y,
        bodyZ: item.position.z,
        stationS: sample.stationS,
        requiredRadius,
        hullRadius,
      });
      issues.push(
        makeIssue(
          item.id,
          "outsideHull",
          `Требуемый радиус ${requiredRadius.toFixed(2)} м больше радиуса корпуса ${hullRadius.toFixed(2)} м при body.x=${x.toFixed(2)} м (s=${sample.stationS.toFixed(2)} м).`,
        ),
      );
      break;
    }
  }

  return freezeIssues(issues);
}

function aabbIntersects(first: Aabb, second: Aabb): boolean {
  return (
    first.min.x <= second.max.x &&
    first.max.x >= second.min.x &&
    first.min.y <= second.max.y &&
    first.max.y >= second.min.y &&
    first.min.z <= second.max.z &&
    first.max.z >= second.min.z
  );
}

function sphereSphereIntersects(first: EquipmentItem, second: EquipmentItem): boolean {
  if (first.shape !== "sphere" || second.shape !== "sphere") return false;
  const distance = Math.hypot(
    first.position.x - second.position.x,
    first.position.y - second.position.y,
    first.position.z - second.position.z,
  );
  return distance <= first.dimensions.radius + second.dimensions.radius;
}

function pairIntersects(first: EquipmentItem, second: EquipmentItem, firstAabb: Aabb, secondAabb: Aabb): boolean {
  if (!aabbIntersects(firstAabb, secondAabb)) return false;
  if (first.shape === "sphere" && second.shape === "sphere") return sphereSphereIntersects(first, second);
  return true;
}

function equipmentDisplayName(item: EquipmentItem): string {
  return item.name.trim() || item.id;
}

function evaluateIntersections(items: readonly EquipmentItem[]): readonly EquipmentConstraintIssue[] {
  const issues: EquipmentConstraintIssue[] = [];
  const aabbs = new Map<string, Aabb>();
  let checkedPairs = 0;

  for (const item of items) {
    const aabb = itemAabb(item);
    if (aabb) aabbs.set(item.id, aabb);
  }

  for (let firstIndex = 0; firstIndex < items.length; firstIndex += 1) {
    const first = items[firstIndex];
    const firstAabb = aabbs.get(first.id);
    if (!firstAabb) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < items.length; secondIndex += 1) {
      const second = items[secondIndex];
      const secondAabb = aabbs.get(second.id);
      if (!secondAabb) continue;
      checkedPairs += 1;

      if (!pairIntersects(first, second, firstAabb, secondAabb)) continue;

      const method = first.shape === "sphere" && second.shape === "sphere" ? "sphere-distance" : "conservative-aabb";
      const firstName = equipmentDisplayName(first);
      const secondName = equipmentDisplayName(second);
      logger.warn("equipment intersection detected", { id: first.id, otherId: second.id, firstName, secondName, method });
      logger.debug("[FIX] equipment intersection warning uses display names", { id: first.id, otherId: second.id });
      issues.push(makeIssue(first.id, "intersects", `Пересекается с оборудованием ${secondName}.`, second.id));
      issues.push(makeIssue(second.id, "intersects", `Пересекается с оборудованием ${firstName}.`, first.id));
    }
  }

  logger.debug("equipment intersection checks completed", {
    checkedPairs,
    intersections: issues.length / 2,
  });

  return freezeIssues(issues);
}

export function equipmentStatus(
  report: EquipmentConstraintReport | undefined,
  equipmentId: string,
): EquipmentConstraintStatus {
  return report?.statusById.get(equipmentId) ?? "ok";
}

export function equipmentIssues(
  report: EquipmentConstraintReport | undefined,
  equipmentId: string,
): readonly EquipmentConstraintIssue[] {
  return report?.issuesById.get(equipmentId) ?? Object.freeze([]);
}

export function evaluateEquipmentConstraints(
  snapshot: ProfileSnapshot,
  items: readonly EquipmentItem[],
): EquipmentConstraintReport {
  logger.debug("equipment constraints evaluation started", { equipmentCount: items.length });
  if (items.length === 0) {
    logger.debug("equipment constraints evaluation completed", { equipmentCount: 0, issueCount: 0 });
    return emptyReport(items);
  }

  const issues: EquipmentConstraintIssue[] = [];
  const validItems: EquipmentItem[] = [];

  for (const item of items) {
    const validation = validateEquipmentItem(item);
    if (!validation.isValid) {
      logger.warn("invalid equipment item in constraints", {
        id: item.id,
        shape: item.shape,
        reason: validation.reason,
      });
      issues.push(makeIssue(item.id, "invalidEquipment", validation.reason ?? "Данные оборудования некорректны."));
      continue;
    }

    validItems.push(item);
    issues.push(...evaluateContainment(snapshot, item));
  }

  issues.push(...evaluateIntersections(validItems));

  const report = buildReport(items, issues);
  const outsideCount = issues.filter((issue) => issue.reason === "outsideHull" || issue.reason === "outsideLength").length;
  const invalidCount = issues.filter((issue) => issue.reason === "invalidEquipment").length;
  logger.debug("equipment containment checks completed", { checked: validItems.length, outsideCount });
  logger.debug("equipment constraints evaluation completed", {
    equipmentCount: items.length,
    issueCount: report.issues.length,
    invalidCount,
  });

  return report;
}

export function equipmentStatusSummary(report: EquipmentConstraintReport | undefined): Record<EquipmentConstraintStatus, number> {
  const summary: Record<EquipmentConstraintStatus, number> = {
    ok: 0,
    outsideHull: 0,
    intersects: 0,
    invalidEquipment: 0,
  };

  if (!report) return summary;
  for (const status of report.statusById.values()) {
    summary[status] += 1;
  }
  return summary;
}
