import type { EquipmentConstraintStatus } from "../equipment/constraints";

export type RenderingSemanticStatus = "normal" | "warning" | "error";

export interface RenderingStatusColor {
  readonly semanticStatus: RenderingSemanticStatus;
  readonly canvasStroke: string;
  readonly canvasFill: string;
  readonly materialColor: number;
}

const renderingStatusColors: Record<RenderingSemanticStatus, RenderingStatusColor> = {
  normal: Object.freeze({
    semanticStatus: "normal",
    canvasStroke: "#075f59",
    canvasFill: "rgba(11, 127, 119, 0.16)",
    materialColor: 0x075f59,
  }),
  warning: Object.freeze({
    semanticStatus: "warning",
    canvasStroke: "#c77c21",
    canvasFill: "rgba(199, 124, 33, 0.2)",
    materialColor: 0xc77c21,
  }),
  error: Object.freeze({
    semanticStatus: "error",
    canvasStroke: "#bd3454",
    canvasFill: "rgba(189, 52, 84, 0.22)",
    materialColor: 0xbd3454,
  }),
};

export function renderingSemanticStatus(status: EquipmentConstraintStatus): RenderingSemanticStatus {
  if (status === "intersects") return "warning";
  if (status === "outsideHull" || status === "invalidEquipment") return "error";
  return "normal";
}

export function renderingStatusColor(status: EquipmentConstraintStatus): RenderingStatusColor {
  return renderingStatusColors[renderingSemanticStatus(status)];
}
