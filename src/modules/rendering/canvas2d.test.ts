import { afterEach, describe, expect, it, vi } from "vitest";
import type { EquipmentItem } from "../equipment/model";
import type { ProfileSnapshot } from "../geometry/model";
import { makeEllipseSectionShape, sectionShapeExtents } from "../geometry/section-shape";
import { equipmentXzProjection, renderCanvasProfile } from "./canvas2d";

function profilePoint(s: number, halfBreadthY: number, halfHeightZ: number) {
  const shape = makeEllipseSectionShape(halfBreadthY, halfHeightZ);
  return Object.freeze({ s, shape, ...sectionShapeExtents(shape) });
}

const snapshot: ProfileSnapshot = Object.freeze({
  state: Object.freeze({
    geometryMode: "current-formula",
    length: 2,
    breadth: 1,
    height: 1,
    slenderness: 2,
    diameter: 1,
    cylindricalInsertLength: 0,
    stations: 2,
  }),
  smoothPoints: Object.freeze([
    profilePoint(0, 0, 0),
    profilePoint(1, 0.5, 0.5),
    profilePoint(2, 0, 0),
  ]),
  stationPoints: Object.freeze([
    Object.freeze({ ...profilePoint(1, 0.5, 0.5), topRadius: 0.5, bottomRadius: -0.5 }),
  ]),
  extents: Object.freeze({
    maxRadius: 0.5,
    maxHalfBreadthY: 0.5,
    maxHalfHeightZ: 0.5,
    maxHeight: 1,
    maxRadiusS: 1,
    totalLength: 2,
  }),
});

function makeContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    setLineDash: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    font: "",
  } as unknown as CanvasRenderingContext2D & { fillText: ReturnType<typeof vi.fn>; arc: ReturnType<typeof vi.fn> };
}

function makeCanvas(context: CanvasRenderingContext2D): HTMLCanvasElement {
  return {
    id: "profile-canvas",
    width: 0,
    height: 0,
    getBoundingClientRect: () => ({ width: 600, height: 300 }),
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("equipment XZ projection", () => {
  it("uses Body x/z and lengthX/heightZ for a non-cubic box", () => {
    const item: EquipmentItem = {
      id: "box",
      name: "Box",
      shape: "box",
      massKg: 1,
      position: { x: 2, y: 30, z: -4 },
      orientation: "y",
      dimensions: { lengthX: 10, breadthY: 20, heightZ: 6 },
    };

    expect(equipmentXzProjection(item)).toEqual({
      center: { right: 2, down: -4 },
      halfWidth: 5,
      halfHeight: 3,
    });
  });

  it.each([
    ["x", 4, 1],
    ["y", 1, 1],
    ["z", 1, 4],
  ] as const)("matches cylinder %s dimensions in XZ", (orientation, halfWidth, halfHeight) => {
    const item: EquipmentItem = {
      id: `cylinder-${orientation}`,
      name: "Cylinder",
      shape: "cylinder",
      massKg: 1,
      position: { x: 0, y: 0, z: 0 },
      orientation,
      dimensions: { radius: 1, length: 8 },
    };

    expect(equipmentXzProjection(item)).toMatchObject({ halfWidth, halfHeight });
  });
});

describe("canvas profile render options", () => {
  it.each([
    [{ showGrid: false, showPoints: false }, 3, 0],
    [{ showGrid: true, showPoints: true }, 22, 2],
  ] as const)("renders grid and station points from explicit options %#", (options, fillTextCalls, arcCalls) => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("Path2D", class {
      moveTo = vi.fn();
      lineTo = vi.fn();
      closePath = vi.fn();
    });
    const context = makeContext();

    renderCanvasProfile(makeCanvas(context), snapshot, options);

    expect(context.fillText).toHaveBeenCalledTimes(fillTextCalls);
    expect(context.arc).toHaveBeenCalledTimes(arcCalls);
    expect(snapshot.state).not.toHaveProperty("showGrid");
    expect(snapshot.state).not.toHaveProperty("showPoints");
  });
});
