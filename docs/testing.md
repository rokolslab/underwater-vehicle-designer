[← Data and Export](data-and-export.md) · [Back to README](../README.md) · [Docker Workflow →](docker.md)

# Testing

Проект использует Vitest для расчетных модулей, persistence и UI-contract проверок.

## Commands

```bash
npm run check:encoding
npm run test
npm run test:e2e
npm run build
```

Docker equivalents:

```bash
docker compose run --rm app npm run check:encoding
docker compose run --rm app npm run test
docker compose run --rm app npm run build
```

Playwright E2E через project e2e service:

```bash
docker compose -f compose.yml -f compose.e2e.yml run --rm e2e npm install
docker compose -f compose.yml -f compose.e2e.yml run --rm e2e npm run test:e2e
```

Browser E2E через Playwright требует установленный браузер:

```bash
npx playwright install chromium
npm run test:e2e
```

По умолчанию Playwright сам запускает Vite dev server на `127.0.0.1:5173`. Для проверки уже запущенного приложения задайте `PLAYWRIGHT_BASE_URL`, например:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 npm run test:e2e
```

Текущий Docker app image основан на Alpine и не является основным окружением для browser automation. Для CI/browser smoke предпочтительнее запускать Playwright локально или в отдельном Playwright container image.

Docker-запуск через официальный Playwright image после установки зависимостей в e2e volume:

```bash
docker compose -f compose.yml -f compose.e2e.yml run --rm e2e npm run test:e2e
```

## Test Layout

Тесты лежат рядом с модулями:

| Area | Examples |
| --- | --- |
| `src/modules/geometry/` | `section-shape.test.ts`, `profile.test.ts`, `theoretical-drawing.test.ts` |
| `src/modules/equipment/` | `model.test.ts`, `placement.test.ts`, `constraints.test.ts` |
| `src/modules/balance/` | `equipment-balance.test.ts` |
| `src/modules/rendering/` | `mesh.test.ts`, `scene3d.test.ts`, `equipment3d.test.ts` |
| `src/modules/persistence/` | `csv.test.ts`, `svg.test.ts`, `project-json.test.ts` |
| `src/modules/ui/` | `equipment.test.ts`, `metrics.test.ts`, `interactionState.test.ts`, `equipmentInspector.test.ts`, `diagnostics.test.ts` |
| `src/app/` | `appState.test.ts`, `application-gravity.test.ts`, `projectEvaluationRuntime.test.ts`, `dom-contract.test.ts` |
| `src/application/project/` | `derive.test.ts`, `dependency-contract.test.ts`, `normalize.test.ts`, `reducer.test.ts`, `store.test.ts` |
| `tests/e2e/` | `import-export.spec.ts` |

## Geometry Regression

`section-shape.test.ts` проверяет pure `SectionShape` operations: ellipse area, containment, contour sampling order, normals, zero-section behavior, waterline/buttock intersections and no console side effects.

`profile.test.ts` проверяет:

- `height`/compatibility `diameter` являются полной максимальной высотой;
- current-formula масштабирует эллиптические сечения по независимым `B`/`H`;
- legacy mode передает `B` в `MaxWl`, `H` в `MaxBt`;
- current/legacy section evaluations несут `shape.kind = "ellipse"` alongside compatibility extents;
- `radiusAt` совпадает с fixture из `tests/fixtures/formula-profile.json`;
- contract станций: `0`, half-step, равномерные станции, `L - halfStep`, `L`;
- ЦВК дает постоянный радиус на вставке;
- `ProfileSnapshot` immutable и содержит 321 smooth point.

## Theoretical Drawing Tests

`theoretical-drawing.test.ts` проверяет:

- данные чертежа используют `ProfileSnapshot` без изменения extents;
- секции строятся из station points;
- `Корпус` делит секции на носовые, кормовые и мидель;
- батоксы и ватерлинии создают внутренние curves;
- internal curves делегируют intersections в `SectionShape`, а body-plan sections несут sampled contour points;
- waterlines симметричны, buttocks положительные.

## Equipment and Constraint Tests

Проверяются:

- объемы сферы, цилиндра и блока;
- валидация id, name, mass, dimensions, displaced volume;
- создание, update, rename, delete;
- сохранение пробелов в `Наименование`;
- выход за shape-aware сечение корпуса;
- выход за продольные границы;
- пересечения sphere-sphere;
- консервативная AABB-проверка для остальных форм;
- приоритет статуса `outsideHull` над `intersects`.

## Balance Tests

`equipment-balance.test.ts` проверяет:

| Scenario | Expected |
| --- | --- |
| empty equipment | invalid result + `emptyEquipment` |
| one item | масса, объем, вес, плавучесть, CG, CB |
| two items | CG взвешен по массе, CB по объему |
| no explicit displaced volume | используется геометрический объем |
| invalid equipment | объект пропущен, warning сохранен |
| invalid density/gravity | invalid result |
| negative buoyancy | `nonPositiveBuoyancy` |
| CB below CG | `unstableVerticalCenters` |

## Persistence Tests

Проверяются:

- CSV header and rows;
- SVG path generation;
- JSON schema version;
- JSON normalization for profile, equipment, scene3d and balance settings;
- canonical JSON round-trip без повторной duplicate-ID normalization;
- preservation of `balanceSettings.gravityMPerS2` through parse/build/parse;
- import → `addEquipmentItem()` uniqueness for IDs like `equipment-1`;
- rejection of invalid JSON/root/schema.

`placement.test.ts` separately covers logger-free equipment transitions and collection-level ID allocation: empty list starts at `equipment-1`, gaps and deletes reuse the first free default ID, independent branches from `[]` are deterministic, custom factories are called once, blank custom IDs fall back to default allocation, and collisions use the first free suffix.

`application-gravity.test.ts` checks the browser-free application seam: parsed JSON applies imported gravity to canonical inputs, unrelated `ProjectCommand` dispatches preserve it through `ProjectStore`, export/import keeps it without warnings, and reset returns gravity to `DEFAULT_GRAVITY_M_PER_S2`.

`reducer.test.ts` covers every `ProjectCommand` variant, caller ownership, deep freeze, structural sharing, no-op rules, deterministic equipment IDs, shape defaults, unknown equipment IDs and preservation of `gravityMPerS2` on unrelated commands.

`derive.test.ts` checks `deriveProject(ProjectInputs)`: current/legacy modes, independent `B/H`, ЦВК, drawing coherence, constraints, custom density/gravity, equipment-only buoyancy discriminator and no console side effects.

`dependency-contract.test.ts` walks value-import runtime closures from `derive.ts`, `reducer.ts`, `store.ts`, `section-shape.ts`, theoretical drawing core and constraints with the TypeScript compiler API. It rejects adapter/browser/logger dependencies in pure calculation/application mutation graphs and guards rendering/export adapters against `geometryMode` branches for shape-derived flows.

`projectEvaluationRuntime.test.ts` checks atomic publication semantics and explicit harness `dispatch result -> runtime.commit`: derive failure keeps the previous pair, render failure publishes the new pair, changed commands call derive once, no-op commands and view-only rerender do not call derive.

## Coordinate and Migration Regressions

- правый базис Body/SNAME-NED и преобразования `s↔body.x`;
- Body↔Three и знаки XZ/XY/YZ projections;
- три оси цилиндра, стороны clipping и сечения `[-L/2,+L/2]`;
- fixtures JSON v1/v2, marker `SNAME_NED_BODY_CENTER_V1` и предупреждение `old.z=starboard`;
- миграция размеров box и секущих плоскостей;
- `BG`, знаки моментов и equipment-only ограничение ЦВ.

## UI Contract Tests

`dom-contract.test.ts` защищает DOM ids, которые требуются `main.ts`. Если в `index.html` переименовать элемент без изменения `main.ts`, тест должен упасть.

`equipment.test.ts` проверяет HTML editor и чтение updates из строк оборудования. `interactionState.test.ts` покрывает pure-функции `WorkbenchInteractionState`: дефолтное состояние, select/clear/hover/clearHover без мутации, `resolveSelectionAfterDelete` с выбором предыдущего/следующего/fallback. `equipmentInspector.test.ts` проверяет view-model инспектора для всех форм оборудования (сфера/цилиндр/блок), пустое состояние и отображение engineering-статуса. `diagnostics.test.ts` проверяет очередь диагностик: ограничения и баланс, dedupe `invalidEquipment`, пропуск `equipmentOnlyBuoyancyModel`, severity-сортировку, пустое состояние и equipment-targeted предупреждения.

## Browser E2E Tests

`tests/e2e/import-export.spec.ts` запускает приложение в Chromium и проверяет пользовательские workflow: импорт JSON v2 с `gravityMPerS2`, отображение импортированного оборудования, добавление нового оборудования без collision по ID, экспорт проекта и сохранение `gravityMPerS2`, `waterDensityKgPerM3` и уникальных `equipment.id`; reset после import; invalid JSON nonmutation после изменений; SVG/CSV/theoretical SVG exports; mobile viewport без горизонтального overflow.

## Encoding Check

`scripts/check-encoding.mjs` проверяет:

- все текстовые файлы читаются как UTF-8;
- нет типичных mojibake tokens;
- ключевые русские UI-строки существуют в ожидаемых файлах.

Это важно на Windows, где terminal output может выглядеть как mojibake даже при корректном файле.

## Manual Smoke Checklist

Перед демонстрацией UI:

1. Запустить `npm run dev`.
2. Проверить, что `Размерения` раскрываются/скрываются.
3. Изменить `L`, `lambda`, `B`, `H` и убедиться, что профиль и эллиптические сечения меняются согласованно.
4. Переключить `Сетка` и `Точки обвода` в боковом виде.
5. Проверить 3D modes: `Сплошной`, `Рентген`, а также `Сечение` в обоих режимах.
6. Добавить два объекта и создать пересечение.
7. Проверить русские предупреждения и отсутствие перекрытия кнопок.
8. Ввести наименование из двух слов.
9. Скачать SVG, CSV и JSON.
10. Загрузить JSON обратно.

Data-integrity smoke for import/export:

1. Импортировать v2 JSON, где `balanceSettings.gravityMPerS2` отличается от default, например `9.81`.
2. Добавить оборудование после import и проверить, что новый ID не конфликтует с импортированными ID.
3. Экспортировать проект и убедиться, что `waterDensityKgPerM3`, `gravityMPerS2` и все `equipment.id` сохранены.
4. Повторно импортировать экспортированный JSON и проверить отсутствие новых duplicate-ID warnings.
5. Выполнить reset и проверить, что gravity в следующем export вернулась к default `9.80665`.

## Public Demo v1 Smoke

Перед публикацией `Public Demo v1` проверьте production container и браузерные сценарии.

Automated/container checks:

```bash
docker compose run --rm app npm run check:encoding
docker compose run --rm app npm run test
docker compose run --rm app npm run build
APP_IMAGE=underwater-vehicle-demo:local docker compose -f compose.yml -f compose.production.yml build app
APP_IMAGE=underwater-vehicle-demo:local docker compose -f compose.yml -f compose.production.yml up -d
curl -fsS http://127.0.0.1/healthz
curl -fsSI http://127.0.0.1/
```

Desktop browser smoke:

- первый экран объясняет `Public Demo v1` без длинного marketing copy;
- 2D canvas и 3D scene видны и реагируют на изменение `L`, `B`, `H`, `lambda`, `ЦВК`;
- переключение geometry mode обновляет профиль и formula display;
- 3D modes `Сплошной`, `Рентген` и независимое `Сечение` работают, а WebGL fallback не блокирует 2D;
- SVG, CSV, JSON и theoretical SVG скачиваются;
- JSON round-trip сохраняет профиль, оборудование и 3D settings;
- добавление оборудования показывает warnings для пересечения и выхода за корпус;
- theoretical drawing читается и прокручивается без поломки layout.

Mobile viewport smoke:

- проверить ширины `360px`, `390px`, `412px`;
- controls, action buttons, equipment editor, таблицы и theoretical drawing не создают нежелательный horizontal overflow страницы;
- 3D drag работает внутри сцены, вертикальная прокрутка страницы остается доступной вне сцены;
- 2D/3D panels, downloads и JSON import/export доступны без перекрытия элементов.

Current run, 2026-07-27:

- `check:encoding`, `test`, `build` passed через Docker;
- Vite chunk-size warning остался non-blocking, без build errors;
- production image build passed после явного production build; checklist выше использует отдельный `APP_IMAGE`, чтобы не перезаписывать development image tag;
- production `/healthz` returned `ok` and `/` returned `HTTP/1.1 200 OK` on `127.0.0.1:80`;
- Docker health status reached `healthy`;
- desktop browser and smartphone/emulated viewport smoke не были выполнены в запуске 2026-07-27; последующие версии добавили committed Playwright suite `tests/e2e/import-export.spec.ts` для основных import/export/reset/mobile сценариев.

## Agent-Assisted Browser Smoke

`opencode.json` регистрирует локальный Playwright MCP server:

```text
npx -y @playwright/mcp@latest
```

Проверка подключения:

```bash
opencode mcp list
```

Playwright MCP предназначен для интерактивной проверки работающего приложения через OpenCode. Он дополняет committed `npm run test:e2e`, но не заменяет Vitest, build и encoding gates. После изменения `opencode.json` перезапустите OpenCode, потому что текущая сессия не перечитывает configuration автоматически.

## When to Add Tests

Добавляйте тест, если меняется:

- формула радиуса или координатная система;
- логика ЦВК;
- формат JSON/CSV/SVG;
- ограничения оборудования;
- баланс или warning codes;
- DOM ids, которые использует `main.ts`;
- нормализация пользовательского ввода.
- application derive/runtime publication boundaries.

## See Also

- [Calculations](calculations.md) — что именно должно быть покрыто регрессиями.
- [Architecture](architecture.md) — границы модулей для тестов.
- [Docker Workflow](docker.md) — запуск проверок в контейнере.
