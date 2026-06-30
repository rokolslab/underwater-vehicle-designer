import { radiusAt } from "./profile";

export interface Section {
  readonly x: number;
  readonly radius: number;
  readonly area: number;
}

export function makeSection(x: number, length: number, diameter: number): Section {
  const radius = radiusAt(x, length, diameter);
  return {
    x,
    radius,
    area: Math.PI * radius * radius,
  };
}
