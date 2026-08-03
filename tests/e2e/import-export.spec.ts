import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
      mode: "cutaway",
      hullOpacity: 0.3,
      section: { type: "longitudinalPlane", plane: "xy", offset: -0.25 },
    },
    balanceSettings: { waterDensityKgPerM3: 1025, gravityMPerS2: 9.81 },
  },
};

test("импорт, добавление оборудования и JSON round-trip сохраняют данные проекта", async ({ page }) => {
  await page.goto("/");

  await page.locator("#project-json-input").setInputFiles({
    name: "project-with-gravity.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importedProject)),
  });

  await expect(page.locator("#project-import-notice")).toContainText("Проект успешно импортирован.");
  await expect(page.locator('#equipment-list [data-equipment-id="equipment-1"]')).toBeVisible();

  await page.locator("#add-equipment").click();
  await expect(page.locator("#equipment-list [data-equipment-id]")).toHaveCount(2);
  await expect(page.locator('#equipment-list [data-equipment-id="equipment-2"]')).toBeVisible();

  const download = page.waitForEvent("download");
  await page.locator("#download-project-json").click();
  const exported = await download;
  const exportedPath = await exported.path();
  expect(exportedPath).not.toBeNull();
  const exportedJson = JSON.parse(await readFile(exportedPath ?? "", "utf8")) as {
    project: {
      balanceSettings: { gravityMPerS2: number; waterDensityKgPerM3: number };
      equipment: Array<{ id: string }>;
    };
  };

  expect(exported.suggestedFilename()).toBe("underwater-vehicle-project.json");
  expect(exportedJson.project.balanceSettings.gravityMPerS2).toBe(9.81);
  expect(exportedJson.project.balanceSettings.waterDensityKgPerM3).toBe(1025);
  expect(exportedJson.project.equipment.map((item) => item.id)).toEqual(["equipment-1", "equipment-2"]);
});
