import type { ProfileSnapshot } from "../geometry/model";

export interface HullMeshData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint32Array;
  readonly radialSegments: number;
  readonly longitudinalSegments: number;
}

export interface HullMeshOptions {
  readonly radialSegments?: number;
}

const defaultRadialSegments = 48;

function normalizeSegments(radialSegments: number | undefined): number {
  return Math.max(8, Math.round(radialSegments ?? defaultRadialSegments));
}

function radiusFromPosition(y: number, z: number): number {
  return Math.hypot(y, z);
}

export function buildHullMeshData(snapshot: ProfileSnapshot, options: HullMeshOptions = {}): HullMeshData {
  const radialSegments = normalizeSegments(options.radialSegments);
  const rings = snapshot.smoothPoints;
  const ringCount = rings.length;
  const verticesPerRing = radialSegments + 1;
  const positions = new Float32Array(ringCount * verticesPerRing * 3);
  const normals = new Float32Array(ringCount * verticesPerRing * 3);
  const uvs = new Float32Array(ringCount * verticesPerRing * 2);
  const indices = new Uint32Array((ringCount - 1) * radialSegments * 6);
  const totalLength = Math.max(snapshot.extents.totalLength, 1);

  for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
    const point = rings[ringIndex];
    const radius = Math.max(0, point.radius);

    for (let radialIndex = 0; radialIndex <= radialSegments; radialIndex += 1) {
      const angle = (radialIndex / radialSegments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const vertexIndex = ringIndex * verticesPerRing + radialIndex;
      const positionOffset = vertexIndex * 3;
      const uvOffset = vertexIndex * 2;

      positions[positionOffset] = point.s;
      positions[positionOffset + 1] = radius * cos;
      positions[positionOffset + 2] = radius * sin;
      normals[positionOffset] = 0;
      normals[positionOffset + 1] = cos;
      normals[positionOffset + 2] = sin;
      uvs[uvOffset] = point.s / totalLength;
      uvs[uvOffset + 1] = radialIndex / radialSegments;
    }
  }

  let indexOffset = 0;
  for (let ringIndex = 0; ringIndex < ringCount - 1; ringIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const a = ringIndex * verticesPerRing + radialIndex;
      const b = (ringIndex + 1) * verticesPerRing + radialIndex;
      const c = (ringIndex + 1) * verticesPerRing + radialIndex + 1;
      const d = ringIndex * verticesPerRing + radialIndex + 1;

      indices[indexOffset] = a;
      indices[indexOffset + 1] = b;
      indices[indexOffset + 2] = d;
      indices[indexOffset + 3] = b;
      indices[indexOffset + 4] = c;
      indices[indexOffset + 5] = d;
      indexOffset += 6;
    }
  }

  return {
    positions,
    normals,
    uvs,
    indices,
    radialSegments,
    longitudinalSegments: Math.max(0, ringCount - 1),
  };
}

export function readVertexRadius(mesh: HullMeshData, vertexIndex: number): number {
  const offset = vertexIndex * 3;
  return radiusFromPosition(mesh.positions[offset + 1], mesh.positions[offset + 2]);
}
