import type { ProfileSnapshot } from "../geometry/model";
import { logger } from "../../shared/logger";
import { profilePointToThree } from "./coordinate-adapter";

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

function radiusFromPosition(threeY: number, threeZ: number): number {
  return Math.hypot(threeY, threeZ);
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

  logger.debug("3d hull mesh data creation started", {
    sourceFrame: "profile(s,radius)",
    targetFrame: "Three(x,y,z)",
    axisMapping: "three=(body.x,-body.z,body.y)",
    ringCount,
    radialSegments,
  });

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

      const position = profilePointToThree(point.s, radius * cos, radius * sin, totalLength);
      const normal = profilePointToThree(totalLength / 2, cos, sin, totalLength);
      positions[positionOffset] = position.x;
      positions[positionOffset + 1] = position.y;
      positions[positionOffset + 2] = position.z;
      normals[positionOffset] = normal.x;
      normals[positionOffset + 1] = normal.y;
      normals[positionOffset + 2] = normal.z;
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

  const result = {
    positions,
    normals,
    uvs,
    indices,
    radialSegments,
    longitudinalSegments: Math.max(0, ringCount - 1),
  };
  logger.debug("3d hull mesh data creation completed", {
    sourceFrame: "profile(s,radius)",
    targetFrame: "Three(x,y,z)",
    vertices: ringCount * verticesPerRing,
    triangles: indices.length / 3,
  });
  return result;
}

export function readVertexRadius(mesh: HullMeshData, vertexIndex: number): number {
  const offset = vertexIndex * 3;
  return radiusFromPosition(mesh.positions[offset + 1], mesh.positions[offset + 2]);
}
