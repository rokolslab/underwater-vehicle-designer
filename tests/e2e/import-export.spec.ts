import { expect, test } from "@playwright/test";
import type { Download, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const DEFAULT_GRAVITY_M_PER_S2 = 9.80665;

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

test("SVG, CSV и теоретический SVG экспортируются из видимого UI", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#profile-canvas")).toBeVisible();
  await expect(page.locator("#hull-scene-3d")).toBeVisible();
  await expect(page.locator("#theoretical-drawing-canvas")).toBeVisible();

  await page.locator("#length").fill("8");
  await page.locator("#breadth").fill("3");
  await page.locator("#height").fill("2");
  await page.locator("#geometry-mode").selectOption("legacy-dsnp-pa");
  await expect(page.locator("#geometry-formula")).toContainText("DSNP_PA");

  const profileSvg = await downloadText(page, "#download-svg");
  expect(profileSvg.filename).toBe("underwater-vehicle-profile.svg");
  expect(profileSvg.text).toContain("<svg");
  expect(profileSvg.text).toContain("+Z вниз");

  const csv = await downloadText(page, "#download-csv");
  expect(csv.filename).toBe("underwater-vehicle-profile.csv");
  expect(csv.text).toContain("N;s_m;body_x_m;half_breadth_y_m;top_z_m;bottom_z_m");
  expect(csv.text).toContain("23;8;-4;0;0;0");

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
  await expect(page.locator("#add-equipment")).toBeVisible();
  await expect(page.locator("#profile-canvas")).toBeVisible();
  await expect(page.locator("#hull-scene-3d")).toBeVisible();

  await page.locator("#add-equipment").click();
  await expect(page.locator("#equipment-list [data-equipment-id]")).toHaveCount(1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(4);
});
