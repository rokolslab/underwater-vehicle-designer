import { sectionExtentsAt } from "../geometry/profile";
import { normalizeGeometryMode, type ProfileSnapshot, type SectionExtents } from "../geometry/model";
import { profileSFromBodyX } from "../../shared/body-coordinates";
import type { BodyPoint3 } from "../../shared/body-coordinates";
import type { EquipmentItem } from "./model";
import { validateEquipmentItem } from "./model";

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

interface ContainmentPointSample {
  readonly bodyX: number;
  readonly stationS: number;
  readonly y: number;
  readonly z: number;
}

interface ProfileSectionEvaluator {
  sectionExtentsAtS(s: number): SectionExtents;
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

function makeProfileSectionEvaluator(snapshot: ProfileSnapshot): ProfileSectionEvaluator {
  const geometryMode = normalizeGeometryMode(snapshot.state.geometryMode);

  return Object.freeze({
    sectionExtentsAtS(s: number): SectionExtents {
      if (geometryMode === "legacy-dsnp-pa") return sectionExtentsFromSnapshot(snapshot, s);
      return sectionExtentsAt(snapshot.state, s);
    },
  });
}

function interpolateSectionExtents(first: SectionExtents, second: SectionExtents, ratio: number): SectionExtents {
  return Object.freeze({
    radius: first.radius + (second.radius - first.radius) * ratio,
    halfBreadthY: first.halfBreadthY + (second.halfBreadthY - first.halfBreadthY) * ratio,
    halfHeightZ: first.halfHeightZ + (second.halfHeightZ - first.halfHeightZ) * ratio,
  });
}

function sectionExtentsFromSnapshot(snapshot: ProfileSnapshot, s: number): SectionExtents {
  const firstPoint = snapshot.smoothPoints[0];
  if (!firstPoint) return sectionExtentsAt(snapshot.state, s);
  if (s <= firstPoint.s) return firstPoint;

  for (let index = 1; index < snapshot.smoothPoints.length; index += 1) {
    const nextPoint = snapshot.smoothPoints[index];
    if (s > nextPoint.s) continue;

    const previousPoint = snapshot.smoothPoints[index - 1];
    const span = nextPoint.s - previousPoint.s;
    if (span <= 0) return nextPoint;
    return interpolateSectionExtents(previousPoint, nextPoint, (s - previousPoint.s) / span);
  }

  return snapshot.smoothPoints[snapshot.smoothPoints.length - 1];
}

function ellipseValue(y: number, z: number, sectionExtents: SectionExtents): number {
  if (sectionExtents.halfBreadthY <= 0 || sectionExtents.halfHeightZ <= 0) {
    return y === 0 && z === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return (y / sectionExtents.halfBreadthY) ** 2 + (z / sectionExtents.halfHeightZ) ** 2;
}

function circleControlOffsets(radius: number): readonly { readonly y: number; readonly z: number }[] {
  const diagonal = radius / Math.SQRT2;
  return Object.freeze([
    { y: 0, z: 0 },
    { y: radius, z: 0 },
    { y: -radius, z: 0 },
    { y: 0, z: radius },
    { y: 0, z: -radius },
    { y: diagonal, z: diagonal },
    { y: diagonal, z: -diagonal },
    { y: -diagonal, z: diagonal },
    { y: -diagonal, z: -diagonal },
  ]);
}

function boxSectionPointSamples(item: EquipmentItem, extents: AxisExtents, bodyX: number, length: number): readonly ContainmentPointSample[] {
  const stationS = profileSFromBodyX(bodyX, length);
  return Object.freeze([
    { bodyX, stationS, y: item.position.y - extents.y, z: item.position.z - extents.z },
    { bodyX, stationS, y: item.position.y - extents.y, z: item.position.z + extents.z },
    { bodyX, stationS, y: item.position.y + extents.y, z: item.position.z - extents.z },
    { bodyX, stationS, y: item.position.y + extents.y, z: item.position.z + extents.z },
  ]);
}

function sphereSectionPointSamples(item: EquipmentItem, bodyX: number, length: number): readonly ContainmentPointSample[] {
  if (item.shape !== "sphere") return Object.freeze([]);

  const stationS = profileSFromBodyX(bodyX, length);
  const dx = Math.abs(bodyX - item.position.x);
  const localRadius = Math.sqrt(Math.max(0, item.dimensions.radius ** 2 - dx ** 2));
  return Object.freeze(
    circleControlOffsets(localRadius).map((offset) => ({
      bodyX,
      stationS,
      y: item.position.y + offset.y,
      z: item.position.z + offset.z,
    })),
  );
}

function cylinderSectionPointSamples(item: EquipmentItem, bodyX: number, length: number): readonly ContainmentPointSample[] {
  if (item.shape !== "cylinder") return Object.freeze([]);

  const stationS = profileSFromBodyX(bodyX, length);
  if (item.orientation === "x") {
    return Object.freeze(
      circleControlOffsets(item.dimensions.radius).map((offset) => ({
        bodyX,
        stationS,
        y: item.position.y + offset.y,
        z: item.position.z + offset.z,
      })),
    );
  }

  const dx = Math.abs(bodyX - item.position.x);
  const localRadius = Math.sqrt(Math.max(0, item.dimensions.radius ** 2 - dx ** 2));
  const halfLength = item.dimensions.length / 2;
  const yOffsets = item.orientation === "y" ? [-halfLength, 0, halfLength] : [-localRadius, 0, localRadius];
  const zOffsets = item.orientation === "z" ? [-halfLength, 0, halfLength] : [-localRadius, 0, localRadius];
  const samples: ContainmentPointSample[] = [];

  for (const yOffset of yOffsets) {
    for (const zOffset of zOffsets) {
      samples.push({ bodyX, stationS, y: item.position.y + yOffset, z: item.position.z + zOffset });
    }
  }

  return Object.freeze(samples);
}

function containmentPointSamples(
  item: EquipmentItem,
  extents: AxisExtents,
  bodyX: number,
  length: number,
): readonly ContainmentPointSample[] {
  if (item.shape === "sphere") return sphereSectionPointSamples(item, bodyX, length);
  if (item.shape === "cylinder") return cylinderSectionPointSamples(item, bodyX, length);
  return boxSectionPointSamples(item, extents, bodyX, length);
}

function evaluateEllipticalContainmentSample(
  evaluator: ProfileSectionEvaluator,
  item: EquipmentItem,
  sample: ContainmentPointSample,
  bodyMinX: number,
  bodyMaxX: number,
): EquipmentConstraintIssue | null {
  const sectionExtents = sample.bodyX < bodyMinX || sample.bodyX > bodyMaxX
    ? { radius: 0, halfBreadthY: 0, halfHeightZ: 0 }
    : evaluator.sectionExtentsAtS(sample.stationS);
  const value = ellipseValue(sample.y, sample.z, sectionExtents);

  if (value <= 1 + 1e-12) return null;

  return makeIssue(
    item.id,
    "outsideHull",
    `Оборудование выходит за эллиптическое сечение корпуса при body.x=${sample.bodyX.toFixed(2)} м (s=${sample.stationS.toFixed(2)} м).`,
  );
}

function evaluateContainment(
  snapshot: ProfileSnapshot,
  evaluator: ProfileSectionEvaluator,
  item: EquipmentItem,
): readonly EquipmentConstraintIssue[] {
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

  if (minX < bodyMinX || maxX > bodyMaxX) {
    issues.push(
      makeIssue(item.id, "outsideLength", `Оборудование выходит за длину корпуса: ${minX.toFixed(2)}..${maxX.toFixed(2)} м.`),
    );
  }

  for (const x of controlXs(item, extents)) {
    for (const sample of containmentPointSamples(item, extents, x, snapshot.state.length)) {
      const issue = evaluateEllipticalContainmentSample(evaluator, item, sample, bodyMinX, bodyMaxX);
      if (issue) {
        issues.push(issue);
        return freezeIssues(issues);
      }
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
      if (!pairIntersects(first, second, firstAabb, secondAabb)) continue;

      const firstName = equipmentDisplayName(first);
      const secondName = equipmentDisplayName(second);
      issues.push(makeIssue(first.id, "intersects", `Пересекается с оборудованием ${secondName}.`, second.id));
      issues.push(makeIssue(second.id, "intersects", `Пересекается с оборудованием ${firstName}.`, first.id));
    }
  }

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
  const evaluator = makeProfileSectionEvaluator(snapshot);
  if (items.length === 0) {
    return emptyReport(items);
  }

  const issues: EquipmentConstraintIssue[] = [];
  const validItems: EquipmentItem[] = [];

  for (const item of items) {
    const validation = validateEquipmentItem(item);
    if (!validation.isValid) {
      issues.push(makeIssue(item.id, "invalidEquipment", validation.reason ?? "Данные оборудования некорректны."));
      continue;
    }

    validItems.push(item);
    issues.push(...evaluateContainment(snapshot, evaluator, item));
  }

  issues.push(...evaluateIntersections(validItems));

  return buildReport(items, issues);
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
