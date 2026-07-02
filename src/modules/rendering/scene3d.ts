import * as THREE from "three";
import type { ProfileSnapshot } from "../geometry/model";
import type { EquipmentConstraintReport } from "../equipment/constraints";
import { equipmentStatus, equipmentStatusSummary } from "../equipment/constraints";
import type { EquipmentItem } from "../equipment/model";
import { logger } from "../../shared/logger";
import { buildHullMeshData } from "./mesh";
import { createEquipmentMaterial, createEquipmentMesh, equipmentSignature } from "./equipment3d";
import type { Scene3dSection, Scene3dSettings } from "./model";
import { defaultScene3dSettings } from "./viewSettings";

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

const initialRotationX = -0.34;
const initialRotationY = 0.62;
const solidBodyOpacity = 0.9;
const xrayWireOpacity = 0.44;
const solidWireOpacity = 0.28;

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
  geometry.translate(-snapshot.extents.totalLength / 2, 0, 0);
  geometry.computeBoundingSphere();
  return geometry;
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
  const radius = Math.max(snapshot.extents.totalLength, snapshot.extents.maxRadius * 2, 1);
  viewState.target.set(0, 0, 0);
  viewState.distance = Math.max(radius * 1.35, 2);
  camera.near = Math.max(0.01, viewState.distance / 100);
  camera.far = viewState.distance * 20;
  updateCamera(camera, viewState);
  logger.debug("3d camera framed", {
    totalLength: snapshot.extents.totalLength,
    maxRadius: snapshot.extents.maxRadius,
    distance: viewState.distance,
  });
}

function clippingPlanesForSection(section: Scene3dSection, totalLength: number): THREE.Plane[] {
  if (section.type === "disabled") return [];

  if (section.type === "crossSectionX") {
    const centeredX = section.x - totalLength / 2;
    return [new THREE.Plane(new THREE.Vector3(-1, 0, 0), centeredX)];
  }

  if (section.plane === "xy") {
    return [new THREE.Plane(new THREE.Vector3(0, 0, -1), section.offset)];
  }

  return [new THREE.Plane(new THREE.Vector3(0, -1, 0), section.offset)];
}

function applyViewSettings(
  renderer: THREE.WebGLRenderer | null,
  bodyMaterial: THREE.MeshStandardMaterial,
  wireMaterial: THREE.LineBasicMaterial,
  settings: Scene3dSettings,
  totalLength: number,
): void {
  const clippingPlanes = settings.mode === "solid" ? [] : clippingPlanesForSection(settings.section, totalLength);
  if (renderer) renderer.localClippingEnabled = clippingPlanes.length > 0;

  bodyMaterial.clippingPlanes = clippingPlanes;
  wireMaterial.clippingPlanes = clippingPlanes;

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
    clippingPlanes: clippingPlanes.length,
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

  scene.background = new THREE.Color(0xffffff);
  scene.add(hullGroup);
  scene.add(equipmentGroup);
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
    updateCamera(camera, viewState);
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

  function replaceEquipment(
    items: readonly EquipmentItem[],
    snapshot: ProfileSnapshot,
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
          equipmentGroup.add(createEquipmentMesh(item, snapshot.extents.totalLength, equipmentMaterials[status]));
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
    applyViewSettings(renderer, bodyMaterial, wireMaterial, settings, snapshot.extents.totalLength);
    const nextSignature = meshSignature(snapshot);
    if (!isSameSignature(currentSignature, nextSignature)) {
      replaceHull(snapshot);
      replaceEquipment(equipment, snapshot, report);
    } else {
      const nextEquipmentSignature = equipmentSignature(equipment, report);
      if (currentEquipmentSignature !== nextEquipmentSignature) {
        replaceEquipment(equipment, snapshot, report);
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
    renderer?.dispose();
    renderer?.domElement.remove();
    logger.debug("3d scene disposed");
  }

  return { render, resize, dispose };
}
