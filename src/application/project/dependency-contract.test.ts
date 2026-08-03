import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const forbiddenImports = ["modules/ui", "modules/rendering", "modules/persistence", "shared/logger"];

describe("application project dependency contract", () => {
  it("does not import DOM, rendering, persistence, or logger modules", () => {
    const sourceDir = join(process.cwd(), "src/application/project");
    const sources = readdirSync(sourceDir).filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));

    for (const file of sources) {
      const content = readFileSync(join(sourceDir, file), "utf8");
      for (const forbidden of forbiddenImports) {
        expect(content, `${file} must not import ${forbidden}`).not.toContain(forbidden);
      }
    }
  });
});
