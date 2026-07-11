import * as THREE from "three";
import type { ProfileSnapshot } from "../geometry/model";
import type { EquipmentConstraintReport } from "../equipment/constraints";
import { equipmentStatus, equipmentStatusSummary } from "../equipment/constraints";
import type { EquipmentItem } from "../equipment/model";
import { logger } from "../../shared/logger";
import { buildHullMeshData } from "./mesh";
import { createEquipmentMaterial, createEquipmentMesh, equipmentSignature } from "./equipment3d";
import type { Scene3dSection, Scene3dSettings, SectionRetainedHalfSpace } from "./model";
import { defaultScene3dSettings } from "./viewSettings";
import {
  bodyAxisToThree,
  bodyClippingPlaneToThree,
  type BodyClippingPlane,
} from "./coordinate-adapter";

export interface HullScene3d {
  readonly render: (
    snapshot: ProfileSnapshot,
    equipment?: readonly EquipmentItem[],
    settings?: Scene3dSettings,
    report?: EquipmentConstraintReport,
  ) => void;
  readonly resize: () => void;
  readonly dispose: () => void;
}

interface ViewState {
  readonly target: THREE.Vector3;
  rotationX: number;
  rotationY: number;
  distance: number;
  isDragging: boolean;
  lastPointerX: number;
  lastPointerY: number;
}

interface MeshSignature {
  readonly length: number;
  readonly diameter: number;
  readonly cylindricalInsertLength: number;
  readonly totalLength: number;
  readonly maxRadius: number;
  readonly smoothPointCount: number;
}

const initialRotationX = -Math.atan(1 / Math.sqrt(2));
const initialRotationY = Math.PI / 4;
const solidBodyOpacity = 0.9;
const xrayWireOpacity = 0.44;
const solidWireOpacity = 0.28;
let axisSchemeLogged = false;

function meshSignature(snapshot: ProfileSnapshot): MeshSignature {
  return {
    length: snapshot.state.length,
    diameter: snapshot.state.diameter,
    cylindricalInsertLength: snapshot.state.cylindricalInsertLength,
    totalLength: snapshot.extents.totalLength,
    maxRadius: snapshot.extents.maxRadius,
    smoothPointCount: snapshot.smoothPoints.length,
  };
}

function isSameSignature(a: MeshSignature | null, b: MeshSignature): boolean {
  return (
    a !== null &&
    a.length === b.length &&
    a.diameter === b.diameter &&
    a.cylindricalInsertLength === b.cylindricalInsertLength &&
    a.totalLength === b.totalLength &&
    a.maxRadius === b.maxRadius &&
    a.smoothPointCount === b.smoothPointCount
  );
}

function createGeometry(snapshot: ProfileSnapshot): THREE.BufferGeometry {
  const mesh = buildHullMeshData(snapshot);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(mesh.uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function createAxisLabel(text: string, color: string, position: THREE.Vector3, scale: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    context.font = "600 28px sans-serif";
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.name = `body-axis-label:${text}`;
  sprite.position.copy(position);
  sprite.scale.set(scale * 3.6, scale * 0.45, 1);
  return sprite;
}

export function createBodyAxisHelper(length: number): THREE.Group {
  const helper = new THREE.Group();
  helper.name = "body-axis-helper";
  const axisLength = Math.max(length, 0.1);
  const labelOffset = axisLength * 1.15;
  const axes = [
    { axis: "x" as const, label: "X — нос", color: 0xdc2626 },
    { axis: "y" as const, label: "Y — правый борт", color: 0x16a34a },
    { axis: "z" as const, label: "Z — вниз", color: 0x2563eb },
  ];

  for (const { axis, label, color } of axes) {
    const mapped = bodyAxisToThree(axis);
    const direction = new THREE.Vector3(mapped.x, mapped.y, mapped.z);
    const arrow = new THREE.ArrowHelper(direction, new THREE.Vector3(), axisLength, color, axisLength * 0.12, axisLength * 0.06);
    arrow.name = `body-axis:${axis}`;
    arrow.userData.bodyAxis = axis;
    helper.add(arrow);
    helper.add(createAxisLabel(label, `#${color.toString(16).padStart(6, "0")}`, direction.multiplyScalar(labelOffset), axisLength));
  }

  if (!axisSchemeLogged) {
    logger.info("3d body axis scheme initialized", {
      sourceFrame: "Body/SNAME-NED",
      targetFrame: "Three.js",
      axisMapping: "three=(body.x,-body.z,body.y)",
      labels: axes.map(({ label }) => label),
    });
    axisSchemeLogged = true;
  }
  return helper;
}

function createRenderer(container: HTMLElement): THREE.WebGLRenderer | null {
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xffffff, 1);
    container.append(renderer.domElement);
    renderer.domElement.className = "scene3d-canvas";
    return renderer;
  } catch (error) {
    logger.warn("3d renderer initialization failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function updateCamera(camera: THREE.PerspectiveCamera, viewState: ViewState): void {
  camera.position.set(viewState.target.x, viewState.target.y, viewState.target.z + viewState.distance);
  camera.lookAt(viewState.target);
  camera.updateProjectionMatrix();
}

function frameSnapshot(camera: THREE.PerspectiveCamera, viewState: ViewState, snapshot: ProfileSnapshot): void {
  const boundingRadius = Math.hypot(snapshot.extents.totalLength / 2, snapshot.extents.maxRadius);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.1));
  const limitingFov = Math.max(0.1, Math.min(verticalFov, horizontalFov));
  viewState.target.set(0, 0, 0);
  viewState.distance = Math.max((boundingRadius / Math.sin(limitingFov / 2)) * 1.12, 2);
  camera.near = Math.max(0.01, viewState.distance / 100);
  camera.far = viewState.distance * 20;
  updateCamera(camera, viewState);
  logger.debug("[FIX] 3d camera framed to full hull", {
    totalLength: snapshot.extents.totalLength,
    maxRadius: snapshot.extents.maxRadius,
    aspect: camera.aspect,
    distance: viewState.distance,
  });
}

export function retainedHalfSpaceForSection(section: Exclude<Scene3dSection, { type: "disabled" }>): SectionRetainedHalfSpace {
  if (section.type === "crossSectionX") return "x<=offset";
  return section.plane === "xy" ? "z<=offset" : "y<=offset";
}

export function bodyClippingPlaneForSection(
  section: Exclude<Scene3dSection, { type: "disabled" }>,
): BodyClippingPlane {
  if (section.type === "crossSectionX") {
    return Object.freeze({ normal: Object.freeze({ x: -1, y: 0, z: 0 }), constant: section.x });
  }

  if (section.plane === "xy") {
    return Object.freeze({ normal: Object.freeze({ x: 0, y: 0, z: -1 }), constant: section.offset });
  }

  return Object.freeze({ normal: Object.freeze({ x: 0, y: -1, z: 0 }), constant: section.offset });
}

export function clippingPlanesForSection(section: Scene3dSection): THREE.Plane[] {
  if (section.type === "disabled") return [];
  const bodyPlane = bodyClippingPlaneForSection(section);
  const threePlane = bodyClippingPlaneToThree(bodyPlane);
  logger.debug("3d body clipping plane converted", {
    sourceFrame: "Body/SNAME-NED",
    targetFrame: "Three.js",
    section,
    retainedHalfSpace: retainedHalfSpaceForSection(section),
    bodyPlane,
    threePlane,
  });
  return [new THREE.Plane(
    new THREE.Vector3(threePlane.normal.x, threePlane.normal.y, threePlane.normal.z),
    threePlane.constant,
  )];
}

export function transformClippingPlanesToWorld(
  localPlanes: readonly THREE.Plane[],
  matrixWorld: THREE.Matrix4,
): THREE.Plane[] {
  return localPlanes.map((plane) => plane.clone().applyMatrix4(matrixWorld));
}

function applyViewSettings(
  bodyMaterial: THREE.MeshStandardMaterial,
  wireMaterial: THREE.LineBasicMaterial,
  settings: Scene3dSettings,
): void {
  if (settings.mode === "solid") {
    bodyMaterial.transparent = true;
    bodyMaterial.opacity = solidBodyOpacity;
    bodyMaterial.depthWrite = true;
    wireMaterial.opacity = solidWireOpacity;
  } else {
    bodyMaterial.transparent = true;
    bodyMaterial.opacity = settings.hullOpacity;
    bodyMaterial.depthWrite = false;
    wireMaterial.opacity = xrayWireOpacity;
  }

  bodyMaterial.needsUpdate = true;
  wireMaterial.needsUpdate = true;
  logger.debug("3d view settings applied", {
    mode: settings.mode,
    opacity: bodyMaterial.opacity,
    depthWrite: bodyMaterial.depthWrite,
  });
}

export function createHullScene3d(container: HTMLElement): HullScene3d {
  const renderer = createRenderer(container);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    metalness: 0.08,
    roughness: 0.42,
    transparent: true,
    opacity: solidBodyOpacity,
    depthWrite: true,
  });
  const wireMaterial = new THREE.LineBasicMaterial({ color: 0x134e4a, transparent: true, opacity: solidWireOpacity });
  const equipmentMaterials = {
    ok: createEquipmentMaterial("ok"),
    outsideHull: createEquipmentMaterial("outsideHull"),
    intersects: createEquipmentMaterial("intersects"),
    invalidEquipment: createEquipmentMaterial("invalidEquipment"),
  };
  const hullGroup = new THREE.Group();
  const equipmentGroup = new THREE.Group();
  const axisHelper = createBodyAxisHelper(0.75);
  const viewState: ViewState = {
    target: new THREE.Vector3(),
    rotationX: initialRotationX,
    rotationY: initialRotationY,
    distance: 6,
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
  };
  let currentHull: THREE.Object3D | null = null;
  let currentSignature: MeshSignature | null = null;
  let currentEquipmentSignature: string | null = null;
  let localClippingPlanes: THREE.Plane[] = [];
  let framedSnapshot: ProfileSnapshot | null = null;
  let worldClippingPlanes: THREE.Plane[] = [];

  scene.background = new THREE.Color(0xffffff);
  scene.add(hullGroup);
  scene.add(equipmentGroup);
  scene.add(axisHelper);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa99c, 1.6));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(3, 6, 8);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xf8fafc, 0.8);
  fillLight.position.set(-5, -3, 4);
  scene.add(fillLight);

  function draw(): void {
    if (!renderer) return;
    renderer.render(scene, camera);
  }

  function resize(): void {
    if (!renderer) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (framedSnapshot) frameSnapshot(camera, viewState, framedSnapshot);
    else updateCamera(camera, viewState);
    draw();
    logger.debug("3d scene resized", { width, height });
  }

  function disposeCurrentHull(): void {
    if (currentHull) {
      hullGroup.remove(currentHull);
      currentHull.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
        }
      });
      currentHull = null;
      currentSignature = null;
    }
  }
  function disposeEquipmentMeshes(): void {
    equipmentGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      }
    });
    equipmentGroup.clear();
    currentEquipmentSignature = null;
  }

  function updateWorldClippingPlanes(): void {
    if (worldClippingPlanes.length === 0) return;
    currentHull?.updateMatrixWorld(true);
    const matrixWorld = currentHull?.matrixWorld ?? new THREE.Matrix4();
    const transformedPlanes = transformClippingPlanesToWorld(localClippingPlanes, matrixWorld);

    for (let index = 0; index < transformedPlanes.length; index += 1) {
      worldClippingPlanes[index].copy(transformedPlanes[index]);
    }

    logger.debug("[FIX] 3d clipping planes transformed", {
      count: worldClippingPlanes.length,
      rotationX: currentHull?.rotation.x ?? null,
      rotationY: currentHull?.rotation.y ?? null,
      planes: transformedPlanes.map((plane) => ({ normal: plane.normal.toArray(), constant: plane.constant })),
    });
  }

  function updateClippingPlanes(settings: Scene3dSettings): void {
    localClippingPlanes = settings.mode === "solid" ? [] : clippingPlanesForSection(settings.section);
    worldClippingPlanes = localClippingPlanes.map((plane) => plane.clone());
    if (renderer) renderer.localClippingEnabled = worldClippingPlanes.length > 0;
    bodyMaterial.clippingPlanes = worldClippingPlanes;
    wireMaterial.clippingPlanes = worldClippingPlanes;
    bodyMaterial.needsUpdate = true;
    wireMaterial.needsUpdate = true;
    updateWorldClippingPlanes();
  }
  function replaceEquipment(
    items: readonly EquipmentItem[],
    report: EquipmentConstraintReport | undefined,
  ): void {
    try {
      disposeEquipmentMeshes();
      const equipmentIds = new Set(items.map((item) => item.id));
      for (const id of report?.statusById.keys() ?? []) {
        if (!equipmentIds.has(id)) logger.warn("3d status map references missing equipment", { id });
      }

      for (const item of items) {
        try {
          const status = equipmentStatus(report, item.id);
          equipmentGroup.add(createEquipmentMesh(item, equipmentMaterials[status]));
        } catch (error) {
          logger.error("3d equipment mesh creation failed", {
            id: item.id,
            shape: item.shape,
            status: equipmentStatus(report, item.id),
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }
      equipmentGroup.rotation.x = viewState.rotationX;
      equipmentGroup.rotation.y = viewState.rotationY;
      axisHelper.rotation.x = viewState.rotationX;
      axisHelper.rotation.y = viewState.rotationY;
      currentEquipmentSignature = equipmentSignature(items, report);
      logger.debug("3d equipment meshes replaced", {
        count: items.length,
        signature: currentEquipmentSignature,
        statusSummary: equipmentStatusSummary(report),
      });
    } catch (error) {
      logger.error("3d equipment mesh replacement failed", {
        count: items.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  function replaceHull(snapshot: ProfileSnapshot): void {
    try {
      disposeCurrentHull();

      const geometry = createGeometry(snapshot);
      const body = new THREE.Mesh(geometry, bodyMaterial);
      const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), wireMaterial);
      const group = new THREE.Group();
      group.add(body);
      group.add(wire);
      group.rotation.x = viewState.rotationX;
      group.rotation.y = viewState.rotationY;
      currentHull = group;
      currentSignature = meshSignature(snapshot);
      hullGroup.add(group);
      updateWorldClippingPlanes();
      framedSnapshot = snapshot;
      frameSnapshot(camera, viewState, snapshot);
      logger.debug("3d hull mesh replaced", {
        points: snapshot.smoothPoints.length,
        totalLength: snapshot.extents.totalLength,
        cylindricalInsertLength: snapshot.state.cylindricalInsertLength,
      });
    } catch (error) {
      logger.error("3d hull geometry replacement failed", {
        mode: "replaceHull",
        totalLength: snapshot.extents.totalLength,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  function render(
    snapshot: ProfileSnapshot,
    equipment: readonly EquipmentItem[] = [],
    settings: Scene3dSettings = defaultScene3dSettings,
    report?: EquipmentConstraintReport,
  ): void {
    if (!renderer) return;
    applyViewSettings(bodyMaterial, wireMaterial, settings);
    updateClippingPlanes(settings);
    const nextSignature = meshSignature(snapshot);
    if (!isSameSignature(currentSignature, nextSignature)) {
      replaceHull(snapshot);
      replaceEquipment(equipment, report);
    } else {
      const nextEquipmentSignature = equipmentSignature(equipment, report);
      if (currentEquipmentSignature !== nextEquipmentSignature) {
        replaceEquipment(equipment, report);
      }
    }
    resize();
  }

  function onPointerDown(event: PointerEvent): void {
    viewState.isDragging = true;
    viewState.lastPointerX = event.clientX;
    viewState.lastPointerY = event.clientY;
    container.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!viewState.isDragging || !currentHull) return;
    const dx = event.clientX - viewState.lastPointerX;
    const dy = event.clientY - viewState.lastPointerY;
    viewState.lastPointerX = event.clientX;
    viewState.lastPointerY = event.clientY;
    viewState.rotationY += dx * 0.008;
    viewState.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, viewState.rotationX + dy * 0.008));
    currentHull.rotation.x = viewState.rotationX;
    currentHull.rotation.y = viewState.rotationY;
    equipmentGroup.rotation.x = viewState.rotationX;
    equipmentGroup.rotation.y = viewState.rotationY;
    axisHelper.rotation.x = viewState.rotationX;
    axisHelper.rotation.y = viewState.rotationY;
    updateWorldClippingPlanes();
    draw();
  }

  function onPointerUp(event: PointerEvent): void {
    viewState.isDragging = false;
    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.08 : 0.92;
    viewState.distance = Math.max(1, Math.min(viewState.distance * factor, 200));
    updateCamera(camera, viewState);
    draw();
  }

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointercancel", onPointerUp);
  container.addEventListener("wheel", onWheel, { passive: false });
  resize();
  logger.debug("3d scene created", { hasRenderer: Boolean(renderer) });

  function dispose(): void {
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerup", onPointerUp);
    container.removeEventListener("pointercancel", onPointerUp);
    container.removeEventListener("wheel", onWheel);
    disposeCurrentHull();
    disposeEquipmentMeshes();
    bodyMaterial.dispose();
    wireMaterial.dispose();
    Object.values(equipmentMaterials).forEach((material) => material.dispose());
    axisHelper.traverse((object) => {
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    renderer?.dispose();
    renderer?.domElement.remove();
    logger.debug("3d scene disposed");
  }

  return { render, resize, dispose };
}
