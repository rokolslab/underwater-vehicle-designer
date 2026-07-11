import { describe, expect, it } from "vitest";
import { makeProfileSnapshot } from "../geometry/profile";
import { buildHullMeshData, readVertexRadius } from "./mesh";

function makeSnapshot(cylindricalInsertLength = 0) {
  return makeProfileSnapshot({
    length: 6,
    slenderness: 3,
    diameter: 2,
    cylindricalInsertLength,
    stations: 20,
    showGrid: true,
    showPoints: true,
  });
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
});
