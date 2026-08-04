const DEFAULT_SECTION_TOLERANCE = 1e-12;

export interface EllipseSectionShape {
  readonly kind: "ellipse";
  /** Exact section semi-axis along Body +Y/-Y, in meters. */
  readonly halfBreadthY: number;
  /** Exact section semi-axis along Body +Z/-Z, in meters. */
  readonly halfHeightZ: number;
}

export type SectionShape = EllipseSectionShape;

export interface SectionPointYZ {
  readonly y: number;
  readonly z: number;
}

export interface SectionShapeBounds {
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface SectionShapeExtents {
  /** Compatibility/display scalar by vertical half-axis `halfHeightZ`. */
  readonly radius: number;
  readonly halfBreadthY: number;
  readonly halfHeightZ: number;
}

function normalizeHalfAxis(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function isNearZero(value: number, tolerance = DEFAULT_SECTION_TOLERANCE): boolean {
  return Math.abs(value) <= tolerance;
}

function makeUniqueSectionPoints(points: readonly SectionPointYZ[], tolerance = DEFAULT_SECTION_TOLERANCE): readonly SectionPointYZ[] {
  const unique: SectionPointYZ[] = [];

  for (const point of points) {
    if (unique.some((existing) => Math.abs(existing.y - point.y) <= tolerance && Math.abs(existing.z - point.z) <= tolerance)) {
      continue;
    }
    unique.push(Object.freeze({ y: isNearZero(point.y, tolerance) ? 0 : point.y, z: isNearZero(point.z, tolerance) ? 0 : point.z }));
  }

  return Object.freeze(unique);
}

export function makeEllipseSectionShape(halfBreadthY: number, halfHeightZ: number): EllipseSectionShape {
  return Object.freeze({
    kind: "ellipse",
    halfBreadthY: normalizeHalfAxis(halfBreadthY),
    halfHeightZ: normalizeHalfAxis(halfHeightZ),
  });
}

export function sectionShapeExtents(shape: SectionShape): SectionShapeExtents {
  return Object.freeze({
    radius: shape.halfHeightZ,
    halfBreadthY: shape.halfBreadthY,
    halfHeightZ: shape.halfHeightZ,
  });
}

export function sectionShapeBounds(shape: SectionShape): SectionShapeBounds {
  return Object.freeze({
    minY: -shape.halfBreadthY,
    maxY: shape.halfBreadthY,
    minZ: -shape.halfHeightZ,
    maxZ: shape.halfHeightZ,
  });
}

export function sectionArea(shape: SectionShape): number {
  return Math.PI * shape.halfBreadthY * shape.halfHeightZ;
}

export function containsSectionPoint(
  shape: SectionShape,
  point: SectionPointYZ,
  tolerance = DEFAULT_SECTION_TOLERANCE,
): boolean {
  const { halfBreadthY, halfHeightZ } = shape;
  const absY = Math.abs(point.y);
  const absZ = Math.abs(point.z);

  if (halfBreadthY === 0 && halfHeightZ === 0) {
    return absY <= tolerance && absZ <= tolerance;
  }

  if (halfBreadthY === 0) {
    return absY <= tolerance && absZ <= halfHeightZ + tolerance;
  }

  if (halfHeightZ === 0) {
    return absY <= halfBreadthY + tolerance && absZ <= tolerance;
  }

  const normalizedDistance = (point.y / halfBreadthY) ** 2 + (point.z / halfHeightZ) ** 2;
  return normalizedDistance <= 1 + tolerance;
}

export function sampleSectionContour(shape: SectionShape, count: number): readonly SectionPointYZ[] {
  const sampleCount = Math.max(0, Math.floor(count));
  if (sampleCount === 0) return Object.freeze([]);

  return Object.freeze(
    Array.from({ length: sampleCount }, (_, index) => {
      const angle = (2 * Math.PI * index) / sampleCount;
      return Object.freeze({
        y: shape.halfBreadthY * Math.cos(angle),
        z: shape.halfHeightZ * Math.sin(angle),
      });
    }),
  );
}

export function intersectSectionWithButtockY(
  shape: SectionShape,
  y: number,
  tolerance = DEFAULT_SECTION_TOLERANCE,
): readonly SectionPointYZ[] {
  const { halfBreadthY, halfHeightZ } = shape;
  const absY = Math.abs(y);

  if (halfBreadthY === 0 && halfHeightZ === 0) {
    return absY <= tolerance ? makeUniqueSectionPoints([{ y: 0, z: 0 }], tolerance) : Object.freeze([]);
  }

  if (halfBreadthY === 0) {
    return absY <= tolerance
      ? makeUniqueSectionPoints(
          [
            { y: 0, z: halfHeightZ },
            { y: 0, z: -halfHeightZ },
          ],
          tolerance,
        )
      : Object.freeze([]);
  }

  if (absY > halfBreadthY + tolerance) return Object.freeze([]);

  if (halfHeightZ === 0) {
    return makeUniqueSectionPoints([{ y, z: 0 }], tolerance);
  }

  const ratio = Math.min(1, absY / halfBreadthY);
  const z = halfHeightZ * Math.sqrt(Math.max(0, 1 - ratio * ratio));

  return makeUniqueSectionPoints(
    [
      { y, z },
      { y, z: -z },
    ],
    tolerance,
  );
}

export function intersectSectionWithWaterlineZ(
  shape: SectionShape,
  z: number,
  tolerance = DEFAULT_SECTION_TOLERANCE,
): readonly SectionPointYZ[] {
  const { halfBreadthY, halfHeightZ } = shape;
  const absZ = Math.abs(z);

  if (halfBreadthY === 0 && halfHeightZ === 0) {
    return absZ <= tolerance ? makeUniqueSectionPoints([{ y: 0, z: 0 }], tolerance) : Object.freeze([]);
  }

  if (halfHeightZ === 0) {
    return absZ <= tolerance
      ? makeUniqueSectionPoints(
          [
            { y: halfBreadthY, z: 0 },
            { y: -halfBreadthY, z: 0 },
          ],
          tolerance,
        )
      : Object.freeze([]);
  }

  if (absZ > halfHeightZ + tolerance) return Object.freeze([]);

  if (halfBreadthY === 0) {
    return makeUniqueSectionPoints([{ y: 0, z }], tolerance);
  }

  const ratio = Math.min(1, absZ / halfHeightZ);
  const y = halfBreadthY * Math.sqrt(Math.max(0, 1 - ratio * ratio));

  return makeUniqueSectionPoints(
    [
      { y, z },
      { y: -y, z },
    ],
    tolerance,
  );
}
