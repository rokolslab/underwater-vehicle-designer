import type { ProfileSnapshot, SmoothPoint } from "./model";

export interface TheoreticalGridLine {
  readonly value: number;
  readonly label: string;
}

export interface TheoreticalSection {
  readonly index: number;
  readonly x: number;
  readonly radius: number;
}

export interface TheoreticalDrawing {
  readonly title: string;
  readonly totalLength: number;
  readonly maxRadius: number;
  readonly maxHeight: number;
  readonly profilePoints: readonly SmoothPoint[];
  readonly halfBreadthPoints: readonly SmoothPoint[];
  readonly sections: readonly TheoreticalSection[];
  readonly waterlines: readonly TheoreticalGridLine[];
  readonly buttocks: readonly TheoreticalGridLine[];
}

const gridDivisions = 4;

function formatGridLabel(value: number): string {
  if (Math.abs(value) < 1e-9) return "0";
  return value.toFixed(2);
}

function makeSymmetricGrid(maxValue: number): readonly TheoreticalGridLine[] {
  if (maxValue <= 0) return Object.freeze([{ value: 0, label: "0" }]);

  const lines: TheoreticalGridLine[] = [];
  for (let index = -gridDivisions; index <= gridDivisions; index += 1) {
    const value = (maxValue * index) / gridDivisions;
    lines.push(Object.freeze({ value, label: formatGridLabel(value) }));
  }
  return Object.freeze(lines);
}

function makePositiveGrid(maxValue: number): readonly TheoreticalGridLine[] {
  if (maxValue <= 0) return Object.freeze([{ value: 0, label: "0" }]);

  const lines: TheoreticalGridLine[] = [];
  for (let index = 0; index <= gridDivisions; index += 1) {
    const value = (maxValue * index) / gridDivisions;
    lines.push(Object.freeze({ value, label: formatGridLabel(value) }));
  }
  return Object.freeze(lines);
}

export function makeTheoreticalDrawing(snapshot: ProfileSnapshot): TheoreticalDrawing {
  const maxRadius = snapshot.extents.maxRadius;
  const sections = snapshot.stationPoints.map((point, index) =>
    Object.freeze({
      index: index + 1,
      x: point.x,
      radius: Math.max(0, point.yTop),
    }),
  );

  return Object.freeze({
    title: "Теоретический чертеж корпуса",
    totalLength: snapshot.extents.totalLength,
    maxRadius,
    maxHeight: snapshot.extents.maxHeight,
    profilePoints: Object.freeze([...snapshot.smoothPoints]),
    halfBreadthPoints: Object.freeze(snapshot.smoothPoints.map((point) => Object.freeze({ x: point.x, y: point.y }))),
    sections: Object.freeze(sections),
    waterlines: makeSymmetricGrid(maxRadius),
    buttocks: makePositiveGrid(maxRadius),
  });
}