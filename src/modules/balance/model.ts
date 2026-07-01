export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface HullBuoyancyInput {
  readonly length: number;
  readonly diameter: number;
}

export interface HullBuoyancyResult {
  readonly isValid: boolean;
  readonly displacedVolume: number;
  readonly center: Vector3;
  readonly reason?: string;
}
