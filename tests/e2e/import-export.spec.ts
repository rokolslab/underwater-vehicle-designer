import { expect, test } from "@playwright/test";
import type { Download, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const DEFAULT_GRAVITY_M_PER_S2 = 9.80665;

interface E2ECameraState {
  readonly distance: number;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
}

interface UvdE2EHooks {
  readonly bodyXzToCanvasPoint?: (right: number, down: number) => { readonly x: number; readonly y: number } | null;
  readonly scene3dCameraState?: () => E2ECameraState | null;
}

async function enableE2EHooks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __UVD_ENABLE_E2E_HOOKS__?: boolean }).__UVD_ENABLE_E2E_HOOKS__ = true;
  });
}

const importedProject = {
  schemaVersion: 2,
  coordinateSystem: "SNAME_NED_BODY_CENTER_V1",
  exportedAt: "2026-08-03T00:00:00.000Z",
  project: {
    profile: {
      length: 10,
      breadth: 2,
      height: 2,
      slenderness: 5,
      diameter: 2,
      cylindricalInsertLength: 1,
      stations: 20,
      showGrid: true,
      showPoints: false,
    },
    equipment: [
      {
        id: "equipment-1",
        name: "Imported box",
        shape: "box",
        massKg: 4,
        position: { x: 1, y: 0.25, z: 0.25 },
        orientation: "x",
        dimensions: { lengthX: 0.6, breadthY: 0.4, heightZ: 0.3 },
      },
    ],
    scene3dSettings: {
      mode: "x-ray",
      hullOpacity: 0.3,
      section: { type: "longitudinalPlane", plane: "xy", offset: -0.25 },
    },
    balanceSettings: { waterDensityKgPerM3: 1001, gravityMPerS2: 9.81 },
  },
};

async function importProject(page: Page): Promise<void> {
  await page.locator("#project-json-input").setInputFiles({
    name: "project-with-gravity.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importedProject)),
  });

  await expect(page.locator("#project-import-notice")).toContainText("Проект успешно импортирован.");
}

async function readDownload(download: Download): Promise<{ filename: string; text: string }> {
  const path = await download.path();
  expect(path).not.toBeNull();

  return {
    filename: download.suggestedFilename(),
    text: await readFile(path ?? "", "utf8"),
  };
}

async function downloadText(page: Page, selector: string): Promise<{ filename: string; text: string }> {
  const downloadPromise = page.waitForEvent("download");
  await page.locator(selector).click();
  return readDownload(await downloadPromise);
}

test("импорт, добавление оборудования и JSON round-trip сохраняют данные проекта", async ({ page }) => {
  await page.goto("/");

  await importProject(page);
  await expect(page.locator('#equipment-list [data-equipment-id="equipment-1"]')).toBeVisible();

  await page.locator("#add-equipment").click();
  await expect(page.locator("#equipment-list [data-equipment-id]")).toHaveCount(2);
  await expect(page.locator('#equipment-list [data-equipment-id="equipment-2"]')).toBeVisible();

  const exported = await downloadText(page, "#download-project-json");
  const exportedJson = JSON.parse(exported.text) as {
    project: {
      balanceSettings: { gravityMPerS2: number; waterDensityKgPerM3: number };
      equipment: Array<{ id: string }>;
    };
  };

  expect(exported.filename).toBe("underwater-vehicle-project.json");
  expect(exportedJson.project.balanceSettings.gravityMPerS2).toBe(9.81);
  expect(exportedJson.project.balanceSettings.waterDensityKgPerM3).toBe(1001);
  expect(exportedJson.project.equipment.map((item) => item.id)).toEqual(["equipment-1", "equipment-2"]);
});

test("reset после импорта возвращает gravity к default и очищает оборудование", async ({ page }) => {
  await page.goto("/");

  await importProject(page);
  await expect(page.locator('#equipment-list [data-equipment-id="equipment-1"]')).toBeVisible();

  await page.locator("#reset").click();
  await expect(page.locator("#equipment-list [data-equipment-id]")).toHaveCount(0);
  await expect(page.locator("#water-density")).toHaveValue("1025");

  const exported = await downloadText(page, "#download-project-json");
  const exportedJson = JSON.parse(exported.text) as {
    project: {
      balanceSettings: { gravityMPerS2: number; waterDensityKgPerM3: number };
      equipment: Array<{ id: string }>;
    };
  };

  expect(exportedJson.project.balanceSettings.gravityMPerS2).toBe(DEFAULT_GRAVITY_M_PER_S2);
  expect(exportedJson.project.balanceSettings.waterDensityKgPerM3).toBe(1025);
  expect(exportedJson.project.equipment).toEqual([]);
});

test("invalid JSON import после изменения проекта не меняет экспортируемый проект", async ({ page }) => {
  await page.goto("/");

  await page.locator("#length").fill("8");
  await page.locator("#breadth").fill("3");
  await page.locator("#water-density").fill("1007");
  const before = JSON.parse((await downloadText(page, "#download-project-json")).text) as { project: unknown };

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Некорректный JSON-файл проекта.");
    await dialog.accept();
  });
  await page.locator("#project-json-input").setInputFiles({
    name: "bad-project.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad json"),
  });

  const after = JSON.parse((await downloadText(page, "#download-project-json")).text) as { project: unknown };
  expect(after.project).toEqual(before.project);
});

test("workbench shell показывает toolbar, сводку и grouped controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Инженерный workbench корпуса" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Переходы по рабочим зонам" })).toBeVisible();
  await expect(page.locator(".workbench-toolbar").locator("#download-project-json")).toBeVisible();
  await expect(page.locator(".workbench-toolbar").locator("#upload-project-json")).toBeVisible();
  await expect(page.locator(".workbench-toolbar").locator("#reset")).toBeVisible();
  await expect(page.locator("#summary-dimensions")).toContainText("L 6,00 м");
  await expect(page.locator("#summary-geometry-mode")).toContainText("Базовая формула");
  await expect(page.locator("#summary-balance")).toHaveAttribute("data-ui-status", "warning");

  const controls = page.locator("#controls");
  await expect(controls.getByText("Геометрия корпуса")).toBeVisible();
  await expect(controls.getByText("Метод и формула")).toBeVisible();
  await expect(controls.getByText("Расчётные настройки")).toBeVisible();
  await expect(controls.locator("#download-project-json")).toHaveCount(0);

  await expect(page.locator(".drawing-panel").locator("#download-svg")).toBeVisible();
  await expect(page.locator(".theoretical-drawing-band").locator("#download-theoretical-drawing-svg")).toBeVisible();
  await expect(page.locator(".data-band").locator("#download-csv")).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});

test("SVG, CSV и теоретический SVG экспортируются из видимого UI", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#profile-canvas")).toBeVisible();
  await expect(page.locator("#hull-scene-3d")).toBeVisible();
  await expect(page.locator("#theoretical-drawing-canvas")).toBeVisible();

  await page.locator("#length").fill("8");
  await page.locator("#breadth").fill("3");
  await page.locator("#height").fill("2");
  await page.locator("#geometry-mode").selectOption("legacy-dsnp-pa");
  await expect(page.locator("#geometry-formula")).toContainText("Классическая методика");

  const profileSvg = await downloadText(page, "#download-svg");
  expect(profileSvg.filename).toBe("underwater-vehicle-profile.svg");
  expect(profileSvg.text).toContain("<svg");
  expect(profileSvg.text).toContain("+Z вниз");

  const csv = await downloadText(page, "#download-csv");
  expect(csv.filename).toBe("underwater-vehicle-profile.csv");
  expect(csv.text).toContain("N;s_m;body_x_m;half_breadth_y_m;top_z_m;bottom_z_m");
  expect(csv.text).toContain("23;8;-4;0;0;0");
  expect(csv.text).toMatch(/;\d+,\d+/);

  const theoreticalSvg = await downloadText(page, "#download-theoretical-drawing-svg");
  expect(theoreticalSvg.filename).toBe("underwater-vehicle-theoretical-drawing.svg");
  expect(theoreticalSvg.text).toContain("<svg");
  expect(theoreticalSvg.text).toContain("Теоретический чертеж");
});

test("mobile viewport сохраняет доступность основных панелей без горизонтального overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("#length")).toBeVisible();
  await expect(page.locator("#download-project-json")).toBeVisible();
  await expect(page.locator("#summary-dimensions")).toBeVisible();
  await expect(page.locator("#add-equipment")).toBeVisible();
  await expect(page.locator("#profile-canvas")).toBeVisible();
  await expect(page.locator("#hull-scene-3d")).toBeVisible();

  await page.locator("#add-equipment").click();
  await expect(page.locator("#equipment-list [data-equipment-id]")).toHaveCount(1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(4);
});

test("equipment row click selection синхронизирует inspector и 2D/3D", async ({ page }) => {
  await page.goto("/");
  await page.locator("#add-equipment").click();
  await expect(page.locator("#equipment-list [data-equipment-id]")).toHaveCount(1);

  await page.locator("[data-equipment-id]").first().click();
  await expect(page.locator("[data-equipment-id]").first()).toHaveClass(/equipment-row--selected/);
  await expect(page.locator(".equipment-inspector-details")).toBeVisible();
});

test("canvas click selection выбирает оборудование по координатам и проверяет выбранный equipmentId", async ({ page }) => {
  await enableE2EHooks(page);
  await page.goto("/");
  await importProject(page);
  await expect(page.locator('#equipment-list [data-equipment-id="equipment-1"]')).toBeVisible();

  const clickPos = await page.evaluate(() => {
    const hooks = (window as unknown as { __UVD_E2E__?: UvdE2EHooks }).__UVD_E2E__;
    return hooks?.bodyXzToCanvasPoint?.(1, 0.25) ?? null;
  });

  expect(clickPos).not.toBeNull();
  if (!clickPos) return;

  await page.locator("#profile-canvas").click({ position: clickPos });

  const selectedRows = page.locator("[data-equipment-selected]");
  await expect(selectedRows).toHaveCount(1);
  await expect(selectedRows).toHaveAttribute("data-equipment-id", "equipment-1");

  await expect(page.locator(".equipment-inspector-details")).toBeVisible();
  await expect(page.locator("#equipment-inspector")).toContainText("Imported box");
});

test("diagnostics entry click навигирует к equipment row вне корпуса", async ({ page }) => {
  await page.goto("/");
  await importProject(page);
  await expect(page.locator('#equipment-list [data-equipment-id="equipment-1"]')).toBeVisible();

  const row = page.locator('#equipment-list [data-equipment-id="equipment-1"]');
  const xInput = row.locator('[data-field="x"]');
  await xInput.fill("8");

  const diagEntry = page.locator(".diagnostics-entry[data-diagnostics-target]").first();
  await expect(diagEntry).toBeVisible({ timeout: 5000 });

  await diagEntry.click();
  await expect(page.locator("[data-equipment-id]").first()).toHaveClass(/equipment-row--selected/);
  await expect(page.locator("[data-equipment-id]").first()).toHaveAttribute("data-equipment-id", "equipment-1");
  await expect(page.locator("[data-equipment-id]").first()).toBeFocused();
});

test("keyboard Enter выбирает equipment row", async ({ page }) => {
  await page.goto("/");
  await page.locator("#add-equipment").click();
  const row = page.locator("[data-equipment-id]").first();
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(row).toHaveClass(/equipment-row--selected/);
});

test("keyboard selection сохраняет focus на equipment row", async ({ page }) => {
  await page.goto("/");
  await page.locator("#add-equipment").click();
  const row = page.locator("[data-equipment-id]").first();
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(row).toBeFocused();
  await expect(row).toHaveClass(/equipment-row--selected/);
});

test("selection не сохраняется в экспортируемом JSON", async ({ page }) => {
  await page.goto("/");
  await page.locator("#add-equipment").click();
  await page.locator("[data-equipment-id]").first().click();

  const exported = await downloadText(page, "#download-project-json");
  const parsed = JSON.parse(exported.text) as Record<string, unknown>;
  expect(JSON.stringify(parsed)).not.toContain("selectedEquipmentId");
  expect(JSON.stringify(parsed)).not.toContain("hoveredEquipmentId");
});

test("3D camera zoom сохраняется после selection", async ({ page }) => {
  await enableE2EHooks(page);
  await page.goto("/");
  await page.locator("#add-equipment").click();
  await page.waitForSelector("#hull-scene-3d canvas");

  const initialCamera = await page.evaluate(() => {
    const hooks = (window as unknown as { __UVD_E2E__?: UvdE2EHooks }).__UVD_E2E__;
    return hooks?.scene3dCameraState?.() ?? null;
  });
  expect(initialCamera).not.toBeNull();
  if (!initialCamera) return;

  await page.locator("#hull-scene-3d").hover();
  await page.mouse.wheel(0, -300);

  const zoomedCamera = await page.evaluate(() => {
    const hooks = (window as unknown as { __UVD_E2E__?: UvdE2EHooks }).__UVD_E2E__;
    return hooks?.scene3dCameraState?.() ?? null;
  });
  expect(zoomedCamera).not.toBeNull();
  expect(zoomedCamera!.distance).not.toBeCloseTo(initialCamera.distance, 4);

  await page.locator("[data-equipment-id]").first().click();

  const afterSelectionCamera = await page.evaluate(() => {
    const hooks = (window as unknown as { __UVD_E2E__?: UvdE2EHooks }).__UVD_E2E__;
    return hooks?.scene3dCameraState?.() ?? null;
  });
  expect(afterSelectionCamera).not.toBeNull();
  expect(afterSelectionCamera!.distance).toBeCloseTo(zoomedCamera!.distance, 8);
  expect(afterSelectionCamera!.position.x).toBeCloseTo(zoomedCamera!.position.x, 8);
  expect(afterSelectionCamera!.position.y).toBeCloseTo(zoomedCamera!.position.y, 8);
  expect(afterSelectionCamera!.position.z).toBeCloseTo(zoomedCamera!.position.z, 8);
});

test("hover не вызывает перерисовку через projectEvaluationRuntime", async ({ page }) => {
  await page.goto("/");
  await page.locator("#add-equipment").click();
  await page.locator("#add-equipment").click();

  await expect(page.locator("[data-equipment-id]")).toHaveCount(2);

  const firstRow = page.locator("[data-equipment-id]").first();
  const domIdentity = await firstRow.evaluate((el: HTMLElement) => {
    const marker = `__e2e_test_marker_${Date.now()}`;
    (el as Record<string, unknown>).__e2e_dom_marker = marker;
    return marker;
  });

  const secondRow = page.locator("[data-equipment-id]").last();
  await secondRow.hover();

  const afterHoverMarker = await firstRow.evaluate((el: HTMLElement) => {
    return (el as Record<string, unknown>).__e2e_dom_marker as string | undefined;
  });
  expect(afterHoverMarker).toBe(domIdentity);

  const rowCount = await page.locator("[data-equipment-id]").count();
  expect(rowCount).toBe(2);
});
