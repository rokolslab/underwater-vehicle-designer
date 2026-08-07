import { afterEach, describe, expect, it, vi } from "vitest";
import type { EquipmentItem } from "../equipment/model";
import type { ProfileSnapshot } from "../geometry/model";
import { makeEllipseSectionShape, sectionShapeExtents } from "../geometry/section-shape";
import {
  equipmentXzProjection,
  renderCanvasProfile,
  renderCanvasInteractionOverlay,
  syncOverlayCanvasSize,
  clearCanvasOverlay,
  createCanvasProfileScale,
  bodyXzToCanvas,
  canvasToBodyXz,
  hitTestEquipmentXz,
} from "./canvas2d";

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

function makeEquipmentItem(id: string, x: number, z: number): EquipmentItem {
  return {
    id,
    name: id,
    shape: "box",
    massKg: 1,
    position: { x, y: 0, z },
    orientation: "x",
    dimensions: { lengthX: 0.8, breadthY: 0.3, heightZ: 0.4 },
  };
}

interface SpyContext extends CanvasRenderingContext2D {
  readonly fills: Array<{ style: string }>;
  readonly strokes: Array<{ style: string }>;
  readonly texts: Array<{ text: string }>;
  readonly arcs: number;
  readonly rects: number;
  readonly ellipses: number;
  readonly clearRects: number;
  readonly saves: number;
  readonly restores: number;
}

function makeSpyContext(): SpyContext {
  const fills: Array<{ style: string }> = [];
  const strokes: Array<{ style: string }> = [];
  const texts: Array<{ text: string }> = [];
  const counters = { arcs: 0, rects: 0, ellipses: 0, clearRects: 0, saves: 0, restores: 0 };

  const self = {
    save: vi.fn(() => { counters.saves += 1; }),
    restore: vi.fn(() => { counters.restores += 1; }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(() => { strokes.push({ style: self.strokeStyle }); }),
    fill: vi.fn(() => { fills.push({ style: self.fillStyle }); }),
    fillText: vi.fn((text: string) => { texts.push({ text }); }),
    setTransform: vi.fn(),
    clearRect: vi.fn(() => { counters.clearRects += 1; }),
    fillRect: vi.fn(),
    setLineDash: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(() => { counters.arcs += 1; }),
    ellipse: vi.fn(() => { counters.ellipses += 1; }),
    rect: vi.fn(() => { counters.rects += 1; }),
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    font: "",
    globalAlpha: 1,
  };

  return Object.defineProperties(
    Object.assign(self, { fills, strokes, texts }),
    {
      arcs: { get: () => counters.arcs, enumerable: true, configurable: true },
      rects: { get: () => counters.rects, enumerable: true, configurable: true },
      ellipses: { get: () => counters.ellipses, enumerable: true, configurable: true },
      clearRects: { get: () => counters.clearRects, enumerable: true, configurable: true },
      saves: { get: () => counters.saves, enumerable: true, configurable: true },
      restores: { get: () => counters.restores, enumerable: true, configurable: true },
    },
  ) as unknown as SpyContext;
}

function makeCanvas(id: string, width: number, height: number, spyCtx: SpyContext): HTMLCanvasElement {
  return {
    id,
    width,
    height,
    getBoundingClientRect: () => ({ width, height }),
    getContext: () => spyCtx,
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
    const spyCtx = makeSpyContext();

    renderCanvasProfile(makeCanvas("profile-canvas", 600, 300, spyCtx), snapshot, options);

    expect(spyCtx.texts.length).toBe(fillTextCalls);
    expect(spyCtx.arcs).toBe(arcCalls);
  });

  it("renderCanvasProfile does NOT draw interaction rects on base canvas", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("Path2D", class {
      moveTo = vi.fn();
      lineTo = vi.fn();
      closePath = vi.fn();
    });
    const spyCtx = makeSpyContext();
    const equipment = [makeEquipmentItem("eq-1", 0, 0)];

    renderCanvasProfile(
      makeCanvas("profile-canvas", 600, 300, spyCtx),
      snapshot,
      { showGrid: false, showPoints: false },
      equipment,
    );

    // Base canvas rect calls are for equipment base rendering using equipmentXzProjection,
    // not for interaction highlights. Interaction stroke uses rgba(11,127,119,...).
    // The base canvas equipment stroke uses renderingStatusColor.canvasStroke.
    // Verify no interaction-specific stroke color was used.
    const hasInteractionStroke = spyCtx.strokes.some(
      (s) => s.style === "rgba(11, 127, 119, 0.85)",
    );
    expect(hasInteractionStroke).toBe(false);
  });

  it("renderCanvasInteractionOverlay draws only to overlay, not base canvas", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("Path2D", class {
      moveTo = vi.fn();
      lineTo = vi.fn();
      closePath = vi.fn();
    });
    const baseCtx = makeSpyContext();
    const overlayCtx = makeSpyContext();
    const baseCanvas = makeCanvas("profile-canvas", 600, 300, baseCtx);
    const overlayCanvas = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtx);
    const equipment = [makeEquipmentItem("eq-1", 0, 0)];

    // Record base canvas state before interaction
    const baseClearRectsBefore = baseCtx.clearRects;

    renderCanvasInteractionOverlay(
      overlayCanvas,
      baseCanvas,
      snapshot,
      equipment,
      { selectedEquipmentId: "eq-1", hoveredEquipmentId: null },
    );

    // Base canvas should NOT be modified
    expect(baseCtx.clearRects).toBe(baseClearRectsBefore);
    expect(baseCtx.saves).toBe(0);
    expect(baseCtx.restores).toBe(0);

    // Overlay should have been cleared and drawn to
    expect(overlayCtx.clearRects).toBe(1);
    expect(overlayCtx.saves).toBeGreaterThan(0);
    expect(overlayCtx.restores).toBeGreaterThan(0);
  });

  it("interaction-only path does NOT draw grid or hull or labels", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("Path2D", class {
      moveTo = vi.fn();
      lineTo = vi.fn();
      closePath = vi.fn();
    });
    const baseCtx = makeSpyContext();
    const overlayCtx = makeSpyContext();
    const baseCanvas = makeCanvas("profile-canvas", 600, 300, baseCtx);
    const overlayCanvas = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtx);
    const equipment = [makeEquipmentItem("eq-1", 0, 0)];

    renderCanvasInteractionOverlay(
      overlayCanvas,
      baseCanvas,
      snapshot,
      equipment,
      { selectedEquipmentId: "eq-1", hoveredEquipmentId: null },
    );

    // Verify no fillText calls (grid labels, axis labels, station labels)
    expect(overlayCtx.texts.length).toBe(0);

    // Verify no arc calls (station points)
    expect(overlayCtx.arcs).toBe(0);

    // Verify no ellipse for hull shape (hull uses Path2D, so it wouldn't appear here;
    // but overlay should ONLY have interaction ellipse/rect for equipment highlight)
    // Equipment base drawing uses fillStyle from renderingStatusColor, not interaction colors.
    // Verify the only stroke styles are interaction colors.
    for (const s of overlayCtx.strokes) {
      expect(s.style).toMatch(/rgba\(11, 127, 119|rgba\(56, 161, 156/);
    }
  });

  it("interaction path does NOT call resize on overlay", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("Path2D", class {
      moveTo = vi.fn();
      lineTo = vi.fn();
      closePath = vi.fn();
    });
    const baseCtx = makeSpyContext();
    const overlayCtx = makeSpyContext();
    const baseCanvas = makeCanvas("profile-canvas", 600, 300, baseCtx);
    const overlayCanvas = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtx);
    const equipment = [makeEquipmentItem("eq-1", 0, 0)];

    const initialOverlayWidth = overlayCanvas.width;
    const initialOverlayHeight = overlayCanvas.height;

    renderCanvasInteractionOverlay(
      overlayCanvas,
      baseCanvas,
      snapshot,
      equipment,
      { selectedEquipmentId: "eq-1", hoveredEquipmentId: null },
    );

    expect(overlayCanvas.width).toBe(initialOverlayWidth);
    expect(overlayCanvas.height).toBe(initialOverlayHeight);
  });

  it("overlay is cleared and redrawn when selected/hovered state changes", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("Path2D", class {
      moveTo = vi.fn();
      lineTo = vi.fn();
      closePath = vi.fn();
    });
    const baseCtx = makeSpyContext();
    const baseCanvas = makeCanvas("profile-canvas", 600, 300, baseCtx);
    const equipment = [makeEquipmentItem("eq-1", 0, 0)];

    // First render: select eq-1
    const overlayCtx1 = makeSpyContext();
    const overlayCanvas1 = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtx1);
    renderCanvasInteractionOverlay(
      overlayCanvas1,
      baseCanvas,
      snapshot,
      equipment,
      { selectedEquipmentId: "eq-1", hoveredEquipmentId: null },
    );
    expect(overlayCtx1.clearRects).toBe(1);

    // Second render: select different - should clear again
    const overlayCtx2 = makeSpyContext();
    const overlayCanvas2 = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtx2);
    renderCanvasInteractionOverlay(
      overlayCanvas2,
      baseCanvas,
      snapshot,
      equipment,
      { selectedEquipmentId: null, hoveredEquipmentId: "eq-1" },
    );
    expect(overlayCtx2.clearRects).toBe(1);

    // Third render: no interaction - should still clear (but not draw)
    const overlayCtx3 = makeSpyContext();
    const overlayCanvas3 = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtx3);
    renderCanvasInteractionOverlay(
      overlayCanvas3,
      baseCanvas,
      snapshot,
      equipment,
      { selectedEquipmentId: null, hoveredEquipmentId: null },
    );
    expect(overlayCtx3.clearRects).toBe(1);
  });

  it("base and overlay transform produce identical canvas coordinates", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    const baseCtx = makeSpyContext();
    const overlayCtx = makeSpyContext();
    const baseCanvas = makeCanvas("profile-canvas", 600, 300, baseCtx);
    const overlayCanvas = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtx);

    const baseScale = createCanvasProfileScale(baseCanvas, snapshot);
    const overlayScale = createCanvasProfileScale(overlayCanvas, snapshot);

    const testPoints = [
      { right: 0, down: 0 },
      { right: 0.5, down: 0.3 },
      { right: -0.5, down: -0.3 },
    ];

    for (const point of testPoints) {
      const baseResult = bodyXzToCanvas(baseScale, point.right, point.down);
      const overlayResult = bodyXzToCanvas(overlayScale, point.right, point.down);

      expect(baseResult.x).toBeCloseTo(overlayResult.x, 10);
      expect(baseResult.y).toBeCloseTo(overlayResult.y, 10);
    }
  });

  it("clearCanvasOverlay clears the full overlay canvas", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    const overlayCtx = makeSpyContext();
    const overlayCanvas = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtx);

    clearCanvasOverlay(overlayCanvas);

    expect(overlayCtx.clearRects).toBe(1);
    expect(overlayCtx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });

  it("renderCanvasInteractionOverlay uses same scale as base canvas", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    vi.stubGlobal("Path2D", class {
      moveTo = vi.fn();
      lineTo = vi.fn();
      closePath = vi.fn();
    });
    const baseCtx = makeSpyContext();
    const overlayCtx = makeSpyContext();
    const baseCanvas = makeCanvas("profile-canvas", 600, 300, baseCtx);
    const overlayCanvas = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtx);
    const baseScale = createCanvasProfileScale(baseCanvas, snapshot);
    const overlayScale = createCanvasProfileScale(overlayCanvas, snapshot);

    const baseBodyCenter = bodyXzToCanvas(baseScale, 0.5, 0.2);
    const overlayBodyCenter = bodyXzToCanvas(overlayScale, 0.5, 0.2);

    expect(baseBodyCenter.x).toBeCloseTo(overlayBodyCenter.x, 10);
    expect(baseBodyCenter.y).toBeCloseTo(overlayBodyCenter.y, 10);
  });

  it("renderCanvasInteractionOverlay clears stale highlights when interaction is undefined or equipment is empty", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    const baseCtx = makeSpyContext();
    const overlayCtxWithoutInteraction = makeSpyContext();
    const overlayCtxWithoutEquipment = makeSpyContext();
    const baseCanvas = makeCanvas("profile-canvas", 600, 300, baseCtx);
    const overlayCanvasWithoutInteraction = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtxWithoutInteraction);
    const overlayCanvasWithoutEquipment = makeCanvas("profile-canvas-overlay", 600, 300, overlayCtxWithoutEquipment);

    renderCanvasInteractionOverlay(overlayCanvasWithoutInteraction, baseCanvas, snapshot, [makeEquipmentItem("eq-1", 0, 0)]);
    renderCanvasInteractionOverlay(
      overlayCanvasWithoutEquipment,
      baseCanvas,
      snapshot,
      [],
      { selectedEquipmentId: "eq-1", hoveredEquipmentId: null },
    );

    expect(overlayCtxWithoutInteraction.clearRects).toBe(1);
    expect(overlayCtxWithoutInteraction.saves).toBe(0);
    expect(overlayCtxWithoutEquipment.clearRects).toBe(1);
    expect(overlayCtxWithoutEquipment.saves).toBe(0);
  });
});

describe("syncOverlayCanvasSize", () => {
  it("matches overlay backing-store size to base canvas", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    const baseCtx = makeSpyContext();
    const overlayCtx = makeSpyContext();
    const baseCanvas = makeCanvas("profile-canvas", 600, 300, baseCtx);
    const overlayCanvas = makeCanvas("profile-canvas-overlay", 0, 0, overlayCtx);

    syncOverlayCanvasSize(overlayCanvas, baseCanvas);

    expect(overlayCanvas.width).toBe(600);
    expect(overlayCanvas.height).toBe(300);
  });

  it("handles high devicePixelRatio", () => {
    vi.stubGlobal("window", { devicePixelRatio: 2 });
    const baseCtx = makeSpyContext();
    const overlayCtx = makeSpyContext();
    const baseCanvas = {
      id: "profile-canvas",
      width: 1200,
      height: 600,
      getBoundingClientRect: () => ({ width: 600, height: 300 }),
      getContext: () => baseCtx,
    } as unknown as HTMLCanvasElement;
    const overlayCanvas = makeCanvas("profile-canvas-overlay", 0, 0, overlayCtx);

    syncOverlayCanvasSize(overlayCanvas, baseCanvas);

    expect(overlayCanvas.width).toBe(1200);
    expect(overlayCanvas.height).toBe(600);
  });
});

describe("canvas profile scale transform", () => {
  function makeCanvasForScale(width: number, height: number): HTMLCanvasElement {
    return {
      id: "profile-canvas",
      width,
      height,
      getBoundingClientRect: () => ({ width, height }),
    } as unknown as HTMLCanvasElement;
  }

  it("computes forward and reverse transforms with round-trip precision", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    const canvas = makeCanvasForScale(600, 300);
    const scale = createCanvasProfileScale(canvas, snapshot);

    const bodyRight = 0.5;
    const bodyDown = -0.3;
    const { x, y } = bodyXzToCanvas(scale, bodyRight, bodyDown);
    const { bodyX, bodyZ: roundTripZ } = canvasToBodyXz(scale, x, y);

    expect(Math.abs(bodyX - bodyRight)).toBeLessThan(1e-6);
    expect(Math.abs(roundTripZ - bodyDown)).toBeLessThan(1e-6);
  });

  it("maps body center to canvas center", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    const canvas = makeCanvasForScale(600, 300);
    const scale = createCanvasProfileScale(canvas, snapshot);

    const { bodyX, bodyZ } = canvasToBodyXz(scale, scale.width / 2, scale.height / 2);
    expect(Math.abs(bodyX)).toBeLessThan(1);
    expect(Math.abs(bodyZ)).toBeLessThan(1);
  });

  it("is consistent when called repeatedly with the same canvas state", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    const canvas = makeCanvasForScale(600, 300);
    const scale1 = createCanvasProfileScale(canvas, snapshot);
    const scale2 = createCanvasProfileScale(canvas, snapshot);

    const testX = 100;
    const testY = 80;
    const r1 = canvasToBodyXz(scale1, testX, testY);
    const r2 = canvasToBodyXz(scale2, testX, testY);
    expect(r1.bodyX).toBeCloseTo(r2.bodyX, 10);
    expect(r1.bodyZ).toBeCloseTo(r2.bodyZ, 10);
  });

  it("handles high devicePixelRatio without mixing CSS and device pixels", () => {
    vi.stubGlobal("window", { devicePixelRatio: 2 });
    const canvas = {
      id: "profile-canvas",
      width: 1200,
      height: 600,
      getBoundingClientRect: () => ({ width: 600, height: 300 }),
    } as unknown as HTMLCanvasElement;

    const scale = createCanvasProfileScale(canvas, snapshot);
    expect(scale.width).toBe(600);
    expect(scale.height).toBe(300);

    const bodyRight = 0;
    const bodyDown = 0;
    const { x, y } = bodyXzToCanvas(scale, bodyRight, bodyDown);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(600);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(300);
  });
});

describe("hitTestEquipmentXz", () => {
  function makeItem(id: string, shape: "box" | "sphere" | "cylinder", x: number, z: number, width: number, height: number): EquipmentItem {
    if (shape === "sphere") {
      return { id, name: id, shape, massKg: 1, position: { x, y: 0, z }, orientation: "x", dimensions: { radius: width } } as EquipmentItem;
    }
    if (shape === "cylinder") {
      return { id, name: id, shape, massKg: 1, position: { x, y: 0, z }, orientation: "x", dimensions: { radius: width, length: height * 2 } } as EquipmentItem;
    }
    return { id, name: id, shape, massKg: 1, position: { x, y: 0, z }, orientation: "x", dimensions: { lengthX: width * 2, breadthY: 0.1, heightZ: height * 2 } } as EquipmentItem;
  }

  it("returns null when no equipment is present", () => {
    expect(hitTestEquipmentXz(0, 0, [])).toBeNull();
  });

  it("hits equipment at its body XZ position", () => {
    const items = [makeItem("eq-1", "box", 1, 0, 0.5, 0.5)];
    expect(hitTestEquipmentXz(1, 0, items)).toBe("eq-1");
  });

  it("returns null when click is outside all equipment bounds", () => {
    const items = [makeItem("eq-1", "box", 1, 0, 0.5, 0.5)];
    expect(hitTestEquipmentXz(10, 10, items)).toBeNull();
  });

  it("selects the topmost (last-added) equipment when two overlap", () => {
    const items = [
      makeItem("eq-1", "box", 0, 0, 1, 1),
      makeItem("eq-2", "box", 0, 0, 1, 1),
    ];
    expect(hitTestEquipmentXz(0, 0, items)).toBe("eq-2");
  });

  it("hits a sphere within its radius", () => {
    const items = [makeItem("sphere-1", "sphere", 0, 0, 0.5, 0.5)];
    expect(hitTestEquipmentXz(0.3, 0.3, items)).toBe("sphere-1");
  });

  it("does not hit a sphere outside its radius", () => {
    const items = [makeItem("sphere-1", "sphere", 0, 0, 0.5, 0.5)];
    expect(hitTestEquipmentXz(0.6, 0, items)).toBeNull();
  });

  it("hits a cylinder with X orientation", () => {
    const items = [makeItem("cyl", "cylinder", 0, 0, 0.3, 1)];
    expect(hitTestEquipmentXz(0.4, 0, items)).toBe("cyl");
  });
});
