import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import ts from "typescript";

const forbiddenImports = ["modules/ui", "modules/rendering", "modules/persistence", "shared/logger"];
const forbiddenRuntimeImportFragments = ["/app/", "/modules/ui/", "/modules/rendering/", "/modules/persistence/", "/shared/logger", "/three"];
const forbiddenRuntimeBareSpecifiers = ["three", "vite"];
const forbiddenRuntimeSourcePatterns = [/import\.meta\.env/u, /\b(document|window|HTMLCanvasElement|HTMLElement|FileReader|ResizeObserver)\b/u];

function resolveRelativeProductionImport(fromFile: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) return undefined;

  const basePath = resolve(dirname(fromFile), specifier);
  const candidates = [basePath, `${basePath}.ts`, join(basePath, "index.ts")];
  return candidates.find((candidate) => existsSync(candidate) && candidate.endsWith(".ts") && !candidate.endsWith(".test.ts"));
}

function collectRuntimeClosure(entryFile: string): readonly string[] {
  const visited = new Set<string>();
  const pending = [entryFile];

  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);

    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (statement.importClause?.isTypeOnly) continue;
      const specifier = statement.moduleSpecifier;
      if (!ts.isStringLiteral(specifier)) continue;
      expect(forbiddenRuntimeBareSpecifiers, `${file} must not import forbidden runtime package ${specifier.text}`).not.toContain(specifier.text);

      const resolvedImport = resolveRelativeProductionImport(file, specifier.text);
      if (resolvedImport) pending.push(resolvedImport);
    }
  }

  return Object.freeze([...visited].sort());
}

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

  it("keeps the deriveProject runtime closure free of adapters and browser globals", () => {
    const projectRoot = process.cwd();
    const closure = collectRuntimeClosure(join(projectRoot, "src/application/project/derive.ts"));

    expect(closure.map((file) => relative(projectRoot, file))).toEqual(expect.arrayContaining([
      "src/application/project/derive.ts",
      "src/modules/geometry/profile.ts",
      "src/modules/equipment/constraints.ts",
      "src/modules/balance/equipment-balance.ts",
    ]));

    for (const file of closure) {
      const normalized = `/${normalize(relative(projectRoot, file)).replaceAll("\\", "/")}`;
      for (const forbidden of forbiddenRuntimeImportFragments) {
        expect(normalized, `${normalized} must not be in derive runtime closure`).not.toContain(forbidden);
      }

      const content = readFileSync(file, "utf8");
      for (const forbiddenPattern of forbiddenRuntimeSourcePatterns) {
        expect(content, `${normalized} must not reference browser/runtime globals`).not.toMatch(forbiddenPattern);
      }
    }
  });

  it("keeps reducer and store runtime closures free of adapters, browser globals, and logger", () => {
    const projectRoot = process.cwd();
    const entries = [
      join(projectRoot, "src/application/project/reducer.ts"),
      join(projectRoot, "src/application/project/store.ts"),
    ];

    for (const entry of entries) {
      const closure = collectRuntimeClosure(entry);
      for (const file of closure) {
        const normalized = `/${normalize(relative(projectRoot, file)).replaceAll("\\", "/")}`;
        for (const forbidden of forbiddenRuntimeImportFragments) {
          expect(normalized, `${normalized} must not be in ${relative(projectRoot, entry)} runtime closure`).not.toContain(forbidden);
        }

        const content = readFileSync(file, "utf8");
        for (const forbiddenPattern of forbiddenRuntimeSourcePatterns) {
          expect(content, `${normalized} must not reference browser/runtime globals`).not.toMatch(forbiddenPattern);
        }
      }
    }
  });

  it("keeps section shape core and shape-aware consumers free of adapter and logger dependencies", () => {
    const projectRoot = process.cwd();
    const entries = [
      join(projectRoot, "src/modules/geometry/section-shape.ts"),
      join(projectRoot, "src/modules/geometry/theoretical-drawing.ts"),
      join(projectRoot, "src/modules/equipment/constraints.ts"),
    ];

    for (const entry of entries) {
      const closure = collectRuntimeClosure(entry);
      for (const file of closure) {
        const normalized = `/${normalize(relative(projectRoot, file)).replaceAll("\\", "/")}`;
        for (const forbidden of forbiddenRuntimeImportFragments) {
          expect(normalized, `${normalized} must not be in ${relative(projectRoot, entry)} runtime closure`).not.toContain(forbidden);
        }

        const content = readFileSync(file, "utf8");
        for (const forbiddenPattern of forbiddenRuntimeSourcePatterns) {
          expect(content, `${normalized} must not reference browser/runtime globals`).not.toMatch(forbiddenPattern);
        }
      }
    }
  });

  it("keeps rendering and export adapters on shape-derived data instead of geometry mode branches", () => {
    const projectRoot = process.cwd();
    const adapterFiles = [
      "src/modules/rendering/mesh.ts",
      "src/modules/rendering/theoretical-drawing.ts",
      "src/modules/persistence/theoretical-drawing-svg.ts",
    ];

    for (const file of adapterFiles) {
      const content = readFileSync(join(projectRoot, file), "utf8");
      expect(content, `${file} must not branch on geometryMode`).not.toMatch(/\b(if|switch)\s*\([^)]*geometryMode/u);
      expect(content, `${file} must not call local ellipse arc rendering for theoretical sections`).not.toContain("sectionArcPath");
    }

    expect(readFileSync(join(projectRoot, "src/modules/rendering/mesh.ts"), "utf8")).toContain("sampleSectionContour");
    expect(readFileSync(join(projectRoot, "src/modules/equipment/constraints.ts"), "utf8")).not.toContain("function ellipseValue");
  });
});
