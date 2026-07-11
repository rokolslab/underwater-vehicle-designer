import { oldV1PointToBody } from "../../shared/body-coordinates";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migratePosition(value: unknown, profileLength: number): unknown {
  if (!isRecord(value)) return value;
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z);
  if (![x, y, z].every(Number.isFinite)) return value;
  return oldV1PointToBody({ x, y, z }, profileLength);
}

function migrateAxis(value: unknown): unknown {
  if (value === "x") return "x";
  if (value === "y") return "z";
  if (value === "z") return "y";
  return value;
}

function migrateDimensions(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const { width, depth, height, ...unchanged } = value;
  return Object.freeze({
    ...unchanged,
    ...(width === undefined ? {} : { lengthX: width }),
    ...(depth === undefined ? {} : { breadthY: depth }),
    ...(height === undefined ? {} : { heightZ: height }),
  });
}

function migrateEquipment(value: unknown, profileLength: number): unknown {
  if (!Array.isArray(value)) return value;
  return Object.freeze(value.map((entry) => {
    if (!isRecord(entry)) return entry;
    return Object.freeze({
      ...entry,
      position: migratePosition(entry.position, profileLength),
      orientation: migrateAxis(entry.orientation),
      dimensions: migrateDimensions(entry.dimensions),
    });
  }));
}

function migrateSceneSection(value: unknown, profileLength: number): unknown {
  if (!isRecord(value)) return value;
  if (value.type === "crossSectionX") {
    const oldX = Number(value.x);
    return Object.freeze({ ...value, x: Number.isFinite(oldX) ? profileLength / 2 - oldX : value.x });
  }
  if (value.type === "longitudinalPlane" && value.plane === "xy") {
    return Object.freeze({ ...value, plane: "xz" });
  }
  if (value.type === "longitudinalPlane" && value.plane === "xz") {
    const oldOffset = Number(value.offset);
    return Object.freeze({
      ...value,
      plane: "xy",
      offset: Number.isFinite(oldOffset) ? -oldOffset : value.offset,
    });
  }
  return value;
}

function migrateSceneSettings(value: unknown, profileLength: number): unknown {
  if (!isRecord(value)) return value;
  return Object.freeze({ ...value, section: migrateSceneSection(value.section, profileLength) });
}

/** Pure one-way conversion of a legacy v1 project payload to v2 field semantics. */
export function migrateProjectV1ToV2(
  project: JsonRecord,
  normalizedProfile: object & { readonly length: unknown },
): JsonRecord {
  const profileLength = Number(normalizedProfile.length);
  if (!Number.isFinite(profileLength) || profileLength <= 0) {
    throw new RangeError("Normalized profile length must be positive and finite");
  }
  return Object.freeze({
    ...project,
    profile: Object.freeze({ ...normalizedProfile }),
    equipment: migrateEquipment(project.equipment, profileLength),
    scene3dSettings: migrateSceneSettings(project.scene3dSettings, profileLength),
  });
}
