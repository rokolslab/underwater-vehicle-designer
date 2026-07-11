/** A free vector expressed in the SNAME/NED body coordinate frame. */
export interface BodyVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A point expressed relative to the geometric center of the body. */
export interface BodyPoint3 extends BodyVector3 {}

/** A point from the legacy v1 project coordinate frame. */
export interface OldV1Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function assertValidBodyLength(length: number): void {
  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError("Body length must be a positive finite number");
  }
}

export function bodyXFromProfileS(profileS: number, length: number): number {
  assertValidBodyLength(length);
  return length / 2 - profileS;
}

export function profileSFromBodyX(bodyX: number, length: number): number {
  assertValidBodyLength(length);
  return length / 2 - bodyX;
}

export function oldV1PointToBody(point: OldV1Point3, length: number): BodyPoint3 {
  assertValidBodyLength(length);
  return Object.freeze({ x: length / 2 - point.x, y: point.z, z: -point.y });
}

export function subtractBodyVectors(minuend: BodyVector3, subtrahend: BodyVector3): BodyVector3 {
  return Object.freeze({
    x: minuend.x - subtrahend.x,
    y: minuend.y - subtrahend.y,
    z: minuend.z - subtrahend.z,
  });
}

export function crossBodyVectors(left: BodyVector3, right: BodyVector3): BodyVector3 {
  return Object.freeze({
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  });
}
