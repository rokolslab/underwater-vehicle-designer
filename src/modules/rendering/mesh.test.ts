import { describe, expect, it } from "vitest";
import type { ProfileSnapshot } from "../geometry/model";
import { makeProfileSnapshot } from "../geometry/profile";
import { makeEllipseSectionShape, sectionShapeExtents } from "../geometry/section-shape";
import { buildHullMeshData, hullMeshSignature, isSameHullMeshSignature, readVertexRadius } from "./mesh";

function makeSnapshot(cylindricalInsertLength = 0) {
  return makeProfileSnapshot({
    length: 6,
    breadth: 2,
    height: 2,
    slenderness: 3,
    diameter: 2,
    cylindricalInsertLength,
    stations: 20,
  });
}

function makeEllipticalSnapshot(): ProfileSnapshot {
  const zeroShape = makeEllipseSectionShape(0, 0);
  const midshipShape = makeEllipseSectionShape(2, 1);
  return Object.freeze({
    state: Object.freeze({
      geometryMode: "legacy-dsnp-pa" as const,
      length: 4,
      breadth: 4,
      height: 2,
      slenderness: 2,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 8,
    }),
    smoothPoints: Object.freeze([
      Object.freeze({ s: 0, shape: zeroShape, ...sectionShapeExtents(zeroShape) }),
      Object.freeze({ s: 2, shape: midshipShape, ...sectionShapeExtents(midshipShape) }),
      Object.freeze({ s: 4, shape: zeroShape, ...sectionShapeExtents(zeroShape) }),
    ]),
    stationPoints: Object.freeze([]),
    extents: Object.freeze({
      maxRadius: 1,
      maxHalfBreadthY: 2,
      maxHalfHeightZ: 1,
      maxHeight: 2,
      maxRadiusS: 2,
      totalLength: 4,
    }),
  });
}

function normalLength(mesh: ReturnType<typeof buildHullMeshData>, vertexIndex: number): number {
  const offset = vertexIndex * 3;
  return Math.hypot(mesh.normals[offset], mesh.normals[offset + 1], mesh.normals[offset + 2]);
}

describe("hull mesh data", () => {
  it("builds a revolved mesh from profile snapshot rings", () => {
    const snapshot = makeSnapshot();
    const radialSegments = 16;
    const mesh = buildHullMeshData(snapshot, { radialSegments });
    const ringCount = snapshot.smoothPoints.length;
    const verticesPerRing = radialSegments + 1;

    expect(mesh.radialSegments).toBe(radialSegments);
    expect(mesh.longitudinalSegments).toBe(ringCount - 1);
    expect(mesh.positions).toHaveLength(ringCount * verticesPerRing * 3);
    expect(mesh.normals).toHaveLength(mesh.positions.length);
    expect(mesh.uvs).toHaveLength(ringCount * verticesPerRing * 2);
    expect(mesh.indices).toHaveLength((ringCount - 1) * radialSegments * 6);
  });

  it("places the nose on positive Three X and the stern on negative Three X", () => {
    const snapshot = makeSnapshot(2);
    const radialSegments = 12;
    const mesh = buildHullMeshData(snapshot, { radialSegments });
    const verticesPerRing = radialSegments + 1;
    const lastRingFirstVertex = (snapshot.smoothPoints.length - 1) * verticesPerRing;

    expect(mesh.positions[0]).toBeCloseTo(snapshot.extents.totalLength / 2, 12);
    expect(mesh.positions[lastRingFirstVertex * 3]).toBeCloseTo(-snapshot.extents.totalLength / 2, 12);
    expect(readVertexRadius(mesh, 0)).toBe(0);
    expect(readVertexRadius(mesh, lastRingFirstVertex)).toBeCloseTo(0, 6);
  });

  it("keeps unit normals on degenerate nose and stern rings", () => {
    const snapshot = makeEllipticalSnapshot();
    const mesh = buildHullMeshData(snapshot, { radialSegments: 8 });
    const verticesPerRing = mesh.radialSegments + 1;
    const sternFirstVertex = (snapshot.smoothPoints.length - 1) * verticesPerRing;

    expect(readVertexRadius(mesh, 0)).toBe(0);
    expect(readVertexRadius(mesh, sternFirstVertex)).toBe(0);
    expect(normalLength(mesh, 0)).toBeCloseTo(1, 12);
    expect(normalLength(mesh, sternFirstVertex)).toBeCloseTo(1, 12);
  });

  it("uses the snapshot total length for uv coordinates", () => {
    const snapshot = makeSnapshot(2);
    const mesh = buildHullMeshData(snapshot, { radialSegments: 8 });
    const lastUvOffset = (snapshot.smoothPoints.length - 1) * (mesh.radialSegments + 1) * 2;

    expect(mesh.uvs[0]).toBe(0);
    expect(mesh.uvs[lastUvOffset]).toBe(1);
  });

  it("keeps the cylindrical insert as a constant maximum-radius section", () => {
    const snapshot = makeSnapshot(2);
    const mesh = buildHullMeshData(snapshot, { radialSegments: 8 });
    const verticesPerRing = mesh.radialSegments + 1;
    const maxRadius = snapshot.extents.maxRadius;
    const maximumRings = snapshot.smoothPoints.filter((point) => Math.abs(point.radius - maxRadius) < 1e-12);

    expect(maximumRings.length).toBeGreaterThan(10);

    for (let ringIndex = 0; ringIndex < snapshot.smoothPoints.length; ringIndex += 1) {
      const radius = readVertexRadius(mesh, ringIndex * verticesPerRing);
      expect(Number.isNaN(radius)).toBe(false);
      expect(radius).toBeGreaterThanOrEqual(0);
      expect(radius).toBeCloseTo(snapshot.smoothPoints[ringIndex].radius, 6);
    }
  });

  it("builds exact elliptical rings from section half-breadth and half-height", () => {
    const snapshot = makeEllipticalSnapshot();
    const mesh = buildHullMeshData(snapshot, { radialSegments: 8 });
    const verticesPerRing = mesh.radialSegments + 1;
    const centerRingStart = verticesPerRing;
    const starboardOffset = (centerRingStart + 0) * 3;
    const downOffset = (centerRingStart + 2) * 3;
    const portOffset = (centerRingStart + 4) * 3;
    const upOffset = (centerRingStart + 6) * 3;

    expect(mesh.positions[starboardOffset + 1]).toBeCloseTo(0, 12);
    expect(mesh.positions[starboardOffset + 2]).toBeCloseTo(2, 12);
    expect(mesh.positions[downOffset + 1]).toBeCloseTo(-1, 12);
    expect(mesh.positions[downOffset + 2]).toBeCloseTo(0, 12);
    expect(mesh.positions[portOffset + 1]).toBeCloseTo(0, 12);
    expect(mesh.positions[portOffset + 2]).toBeCloseTo(-2, 12);
    expect(mesh.positions[upOffset + 1]).toBeCloseTo(1, 12);
    expect(mesh.positions[upOffset + 2]).toBeCloseTo(0, 12);
  });

  it("changes hull mesh signature when geometry mode or section extents change", () => {
    const circular = makeSnapshot();
    const elliptical = makeEllipticalSnapshot();
    const changedShape = makeEllipseSectionShape(1.5, 1);
    const changedExtents = Object.freeze({
      ...elliptical,
      smoothPoints: Object.freeze([
        elliptical.smoothPoints[0],
        Object.freeze({ ...elliptical.smoothPoints[1], shape: changedShape, ...sectionShapeExtents(changedShape) }),
        elliptical.smoothPoints[2],
      ]),
    });

    expect(isSameHullMeshSignature(hullMeshSignature(circular), hullMeshSignature(elliptical))).toBe(false);
    expect(isSameHullMeshSignature(hullMeshSignature(elliptical), hullMeshSignature(changedExtents))).toBe(false);
  });

  it("includes breadth and height in the hull mesh signature", () => {
    const snapshot = makeSnapshot();
    const signature = hullMeshSignature(snapshot);

    expect(signature.breadth).toBe(snapshot.state.breadth);
    expect(signature.height).toBe(snapshot.state.height);
  });
});
