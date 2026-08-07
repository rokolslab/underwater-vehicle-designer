import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { TextDecoder } from "node:util";

const root = process.cwd();
const verbose = process.argv.includes("--verbose") || process.env.DEBUG === "1";
const decoder = new TextDecoder("utf-8", { fatal: true });

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".toml",
  ".yaml",
  ".yml",
]);

const skipDirs = new Set([
  ".agents",
  ".codex",
  ".codex-work",
  ".git",
  "build",
  "dist",
  "node_modules",
]);

const skipAiFactorySubdirs = new Set([
  "archive",
  "evolutions",
  "evolution",
  "patches",
  "plans",
  "qa",
  "specs",
]);

const binaryExtensions = new Set([".xls", ".xlsx"]);
const mojibakeTokens = [
  "\u0420\u045f",
  "\u0420\u0491",
  "\u0421\u0453",
  "\u0432\u0402",
  "\u00e2",
  "\ufffd",
];
const mojibakePattern = new RegExp(mojibakeTokens.join("|"), "u");

const expectedStrings = [
  { file: "index.html", value: "Обвод подводного аппарата" },
  { file: "index.html", value: "Underwater Vehicle Designer" },
  { file: "index.html", value: "Public Demo v1" },
  { file: "index.html", value: "Открыть рабочий экран" },
  { file: "index.html", value: "3D недоступен в этом браузере" },
  { file: "index.html", value: "Размерения" },
  { file: "index.html", value: "Инженерный workbench корпуса" },
  { file: "index.html", value: "Компактный обзор проекта" },
  { file: "index.html", value: "Геометрия корпуса" },
  { file: "index.html", value: "Диагностика и equipment-only баланс" },
  { file: "index.html", value: "Боковой вид" },
  { file: "index.html", value: "Скачать SVG" },
  { file: "index.html", value: "Параметрические станции профиля" },
  { file: "src/app/styles.css", value: "Показать" },
  { file: "src/app/styles.css", value: "Скрыть" },
  { file: "src/modules/ui/table.ts", value: "параметрических станций" },
  { file: "src/modules/ui/equipmentInspector.ts", value: "Выберите оборудование для просмотра параметров" },
  { file: "src/app/main.ts", value: "Удалить выбранное оборудование?" },
  { file: "src/modules/ui/diagnostics.ts", value: "Добавьте оборудование, чтобы увидеть диагностику компоновки" },
  { file: "src/modules/ui/diagnostics.ts", value: "Некорректные данные оборудования" },
  { file: "src/modules/ui/diagnostics.ts", value: "Оборудование вне корпуса" },
  { file: "src/modules/ui/diagnostics.ts", value: "Пересечение оборудования" },
  { file: "src/modules/ui/equipmentInspector.ts", value: "перейти к проблеме" },
];

const results = {
  checked: 0,
  skipped: 0,
  warnings: 0,
  errors: 0,
};

function log(level, message, data = undefined) {
  if (level === "DEBUG" && !verbose) return;
  const suffix = data ? ` ${JSON.stringify(data)}` : "";
  console.log(`${level} [encoding] ${message}${suffix}`);
}

function extensionOf(file) {
  const index = file.lastIndexOf(".");
  return index === -1 ? "" : file.slice(index).toLowerCase();
}

function isSkippedDir(path) {
  const rel = relative(root, path);
  const parts = rel.split(sep).filter(Boolean);
  if (parts.some((part) => skipDirs.has(part))) return true;
  return parts[0] === ".ai-factory" && skipAiFactorySubdirs.has(parts[1]);
}

function collectFiles(dir, files = []) {
  if (isSkippedDir(dir)) {
    results.skipped += 1;
    log("DEBUG", "skipped directory", { dir: relative(root, dir) || "." });
    return files;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(path, files);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = extensionOf(entry.name);
    if (binaryExtensions.has(ext)) {
      results.skipped += 1;
      log("DEBUG", "skipped binary", { file: relative(root, path) });
      continue;
    }
    if (textExtensions.has(ext)) files.push(path);
  }

  return files;
}

function readUtf8(path) {
  const bytes = readFileSync(path);
  return decoder.decode(bytes);
}

function checkTextFile(path) {
  const rel = relative(root, path);
  log("DEBUG", "checking file", { file: rel, bytes: statSync(path).size });

  let text;
  try {
    text = readUtf8(path);
  } catch (error) {
    results.errors += 1;
    log("ERROR", "invalid UTF-8", { file: rel, error: error.message });
    return;
  }

  results.checked += 1;
  const lines = text.split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (!mojibakePattern.test(line)) return;
    results.warnings += 1;
    log("WARN", "possible mojibake pattern", {
      file: rel,
      line: index + 1,
      text: line.trim().slice(0, 160),
    });
  });
}

function checkExpectedStrings() {
  for (const { file, value } of expectedStrings) {
    let text;
    try {
      text = readUtf8(join(root, file));
    } catch (error) {
      results.errors += 1;
      log("ERROR", "cannot read expected-string file", { file, error: error.message });
      continue;
    }

    if (text.includes(value)) {
      log("DEBUG", "expected string found", { file, value });
      continue;
    }

    results.errors += 1;
    log("ERROR", "expected string missing", { file, value });
  }
}

const files = collectFiles(root);
for (const file of files) checkTextFile(file);
checkExpectedStrings();

log("INFO", "encoding check complete", results);

if (results.errors > 0 || results.warnings > 0) {
  process.exitCode = 1;
}
