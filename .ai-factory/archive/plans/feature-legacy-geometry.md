# План реализации: альтернативная legacy-геометрия обводов

Branch: master
Created: 2026-07-27

## Original Request

Пользователь выбрал следующий продуктовый инкремент из roadmap: `1` — legacy-геометрия обводов. После обсуждения согласовано архивировать завершённый `.ai-factory/PLAN.md` по анализу DSNP_PA и создать новый feature-plan для реализации legacy-геометрии.

## Цель

Добавить альтернативный режим геометрии корпуса по материалам DSNP_PA как изолированную modern TypeScript-реализацию, не смешивая её с текущей формулой `formula.xlsx` и не меняя поведение текущего режима по умолчанию.

Новый режим должен использовать существующий архитектурный контракт проекта: pure geometry modules создают общий `ProfileSnapshot`, а Canvas, Three.js, SVG, CSV, таблица, theoretical drawing и проверки оборудования потребляют snapshot без самостоятельного пересчёта геометрии.

## Scope

Включено:

- Явный discriminator режима геометрии профиля: текущая формула и legacy DSNP_PA.
- Pure geometry implementation для legacy-обводов на основе `APPAUNIT.PAS` / `docs/legacy/dsnp-pa-calculation-catalog.md`.
- Поддержка разных полуосей сечения: полуширина по Body Y и полувысота по Body Z.
- Совместимость текущего circular/body-of-revolution режима с существующими fixture `formula.xlsx`.
- Минимальная UI-интеграция: выбор формулы корпуса.
- JSON import/export с безопасной миграцией старых проектов к текущему default-режиму.
- Regression tests для текущей формулы, legacy `MaxBt`/`MaxWl`, ЦВК и сечений.
- Явное ограничение первого legacy-slice: эллиптические сечения. Скруглённо-прямоугольный режим `Priam`/`Kr` фиксируется как follow-up до появления эталонных данных.

Не включено:

- Ходкость, энергетика и сопротивление из `HODK.PAS`.
- Balance/inertia по `UDIFFER.PAS`.
- Полный внешний герметичный объём и гидростатический ЦВ корпуса.
- Legacy `.PRE`/`.PRT` import.
- Доказательство инженерной валидности исторических коэффициентов DSNP_PA.

## Источники

- `docs/legacy/dsnp-pa-calculation-catalog.md`, раздел `APPAUNIT.PAS`: `MaxBt`, `MaxWl`, `R`, `ellipsb`, `ellipss`, `dpb`, `dps`, `Bok`, `Shirota`, `Korp`.
- `docs/legacy/dsnp-pa-integration-roadmap.md`, строка по `APPAUNIT.PAS`.
- `src/modules/geometry/profile.ts` — текущая формула и ЦВК.
- `src/modules/geometry/model.ts` — `ProfileState`, `ProfileSnapshot`.
- `src/modules/geometry/sections.ts` — текущая точка риска: использует `radiusAt` и игнорирует ЦВК.
- `src/modules/equipment/constraints.ts` — containment использует `profileRadiusAt`; нужно перевести на общий snapshot/geometry contract.
- `src/modules/rendering/mesh.ts`, `canvas2d.ts`, `theoretical-drawing.ts`, `svg.ts` — downstream consumers snapshot.
- `src/modules/persistence/project-json.ts` — JSON schema v2 и normalization profile.
- `src/modules/balance/center-of-buoyancy.ts` — deprecated current-formula-only расчёт, который импортирует `PROFILE_RADIUS_NORMALIZATION` напрямую.

## Архитектурные решения

1. Текущий режим остаётся default и должен численно совпадать с `formula.xlsx`.
2. Legacy-формулы реализуются заново в TypeScript с современными именами. Pascal names допустимы только в test descriptions или traceability comments.
3. `ProfileSnapshot` остаётся главным contract между geometry и rendering/export/equipment.
4. Геометрия сечения должна описывать полуось по Y и полуось по Z. Для текущей формулы они равны радиусу.
5. Для совместимости existing consumers могут временно использовать scalar `radius`, но новый contract должен явно указать, что это display/compatibility value, а точная геометрия legacy-сечения задаётся `halfBreadthY` и `halfHeightZ`.
6. Проверки оборудования должны использовать geometry evaluator/snapshot, а не вызывать `radiusAt` напрямую.
7. JSON старых проектов без geometry mode импортируется как текущая формула.
8. Если JSON schema меняется, новая версия должна иметь явную миграцию и warnings только на реальных normalization cases.
9. 3D scope должен быть решён явно: либо elliptical ring mesh реализуется в этом инкременте, либо legacy-режим показывает compatibility approximation с видимым ограничением в UI/docs.

## Риски

- Историческая нормировка DSNP_PA использует `x ∈ [0,1]` и `lc`, а современный профиль использует `s ∈ [0,L]`; нужна явная adapter-функция.
- Legacy `MaxBt` и `MaxWl` дают разные полуоси; 3D mesh текущего тела вращения не является полным представлением такой формы без доработки генератора mesh.
- Скруглённо-прямоугольное сечение (`Priam`, `Kr`) требует отдельного контракта; в первом slice допустимо реализовать эллиптический режим и явно оставить rounded-rect как follow-up, если данных недостаточно.
- Изменение JSON schema может затронуть импорт существующих проектов.
- `scene3d.ts` mesh signature должен учитывать geometry mode и section extents, иначе смена режима при тех же `L/D/Lcyl` может не пересобрать mesh.
- Deprecated `center-of-buoyancy.ts` может создать ложное впечатление поддержки legacy-геометрии, если не зафиксировать его current-formula-only статус.

## Задачи

### Фаза 1: Pure geometry contract

- [x] Task 1: Расширить `src/modules/geometry/model.ts` типами geometry mode и section extents. Добавить backward-compatible strategy: либо `geometryMode` optional с default normalization в `appState`/persistence, либо required field с обновлением всех test factories. Новый snapshot contract должен явно различать compatibility/display `radius` и точные `halfBreadthY`/`halfHeightZ` для сечения. Зависимости: нет. Logging: runtime logging не требуется.

- [x] Task 2: Разделить текущую формулу и legacy evaluator в `src/modules/geometry/`. Текущая формула должна продолжать экспортировать существующие helpers либо иметь thin compatibility layer, чтобы минимизировать изменения downstream imports. Legacy evaluator должен реализовать нормировку `s -> x`, `Lcyl -> lc`, `MaxBt` и `MaxWl` по documented DSNP_PA formula. Зависит от Task 1. Logging: debug только при сборке snapshot, без spam на каждый sample.

- [x] Task 3: Обновить `makeProfileSnapshot`, station/smooth points и extents так, чтобы snapshot содержал корректные полуоси legacy-режима и сохранял прежнее поведение текущей формулы. Зафиксировать, как existing scalar fields (`ProfilePoint.radius`, `StationPoint.topRadius/bottomRadius`, `ProfileExtents.maxRadius`) мапятся на circular и legacy elliptical modes. Зависит от Task 2. Logging: существующий `profile snapshot built` дополнить geometry mode и section extents.

- [x] Task 4: Добавить early Vitest coverage для pure geometry: текущая формула по `formula.xlsx`, legacy `MaxBt`/`MaxWl`, нормировка `s -> x`, `Lcyl -> lc`, extents и legacy ЦВК. Тесты должны ссылаться на docs/legacy как traceability, но не объявлять legacy coefficients инженерно валидными. Зависит от Tasks 2–3. Logging: не требуется.

### Фаза 2: Consumers and constraints

- [x] Task 5: Исправить `src/modules/geometry/sections.ts`, чтобы сечения использовали общий profile/section evaluator и учитывали ЦВК. Добавить регрессию на текущий bug-risk: при `cylindricalInsertLength > 0` section radius/area должны соответствовать plateau вставки. Для legacy elliptical mode area должна использовать `π * halfBreadthY * halfHeightZ`. Зависит от Task 3. Logging: не требуется.

- [x] Task 6: Перевести `src/modules/equipment/constraints.ts` на snapshot/evaluator contract вместо прямого `profileRadiusAt`. Для legacy elliptical section использовать conservative sampling of control points/corners against ellipse, а не один radial offset, чтобы box/cylinder не получали ложный `ok`. Зависит от Task 3. Logging: сохранить существующие warn/debug события, добавить geometry mode в context.

- [x] Task 7: Принять и реализовать 3D/rendering scope для legacy mode. Минимум: обновить `mesh.ts`/`scene3d.ts` так, чтобы mesh signature учитывал geometry mode и section extents. Если реализуется точный legacy 3D, построить elliptical ring mesh. Если выбирается compatibility approximation, явно показать ограничение в UI/docs и tests. Зависит от Task 3. Logging: без новых noisy logs.

- [x] Task 8: Проверить и при необходимости минимально обновить остальные rendering/export consumers (`canvas2d.ts`, `theoretical-drawing.ts`, `svg.ts`, `theoretical-drawing-svg.ts`, `csv.ts`, `table.ts`) так, чтобы текущий режим не изменился, а legacy-режим не пересчитывал геометрию вне snapshot. Зависит от Tasks 3 и 7. Logging: без новых noisy logs.

- [x] Task 9: Зафиксировать статус `src/modules/balance/center-of-buoyancy.ts` как deprecated current-formula-only или изолировать его импорт от нового geometry mode. Этот модуль не должен использоваться как legacy hull-buoyancy implementation. Зависит от Task 3. Logging: не требуется.

### Фаза 3: UI and persistence

- [x] Task 10: Добавить минимальный UI control в `index.html`, `src/modules/ui/controls.ts`, `src/app/appState.ts` и `src/app/main.ts` для выбора режима геометрии. Default — текущая формула. UI-текст должен явно отделять `ЦВК` от `ЦВ`. Добавить/обновить `src/app/appState.test.ts` для default geometry mode, read/reset и normalization. Зависит от Tasks 3 и 8. Logging: normalization выбора режима через existing app state debug.

- [x] Task 11: Обновить `src/modules/persistence/project-json.ts` и при необходимости `project-json-migrations.ts`: сохранить geometry mode в JSON, импортировать старые v2 проекты как текущую формулу, добавить tests для round-trip и migration/default. Если schema bump до v3 выбран, обновить `projectJsonSchemaVersion`, rejection cases для future versions и round-trip expectations в `project-json.test.ts`. Зависит от Task 10. Logging: warnings только при unsupported/normalized mode.

### Фаза 4: Tests and docs

- [x] Task 12: Добавить remaining Vitest coverage для section area, equipment containment на elliptical section, rendering/mesh signature behavior, persistence round-trip/migration/default и export/table compatibility. Зависит от Tasks 5–11.

- [x] Task 13: Обновить документацию (`docs/calculations.md`, `docs/data-and-export.md`, при необходимости `README.md`/`AGENTS.md`) с описанием geometry mode, JSON schema, ограничения legacy-режима эллиптическими сечениями и финального 3D scope из Task 7. Зависит от Tasks 7, 10–12.

- [x] Task 14: Выполнить проверки `npm run check:encoding`, `npm run test`, `npm run build`. Зафиксировать результаты в итоговом отчёте. Зависит от Tasks 1–13.

## Критерии приёмки

- Текущая формула и fixture `formula.xlsx` не изменили численные результаты.
- Старые JSON v2 проекты импортируются без потери данных и получают default geometry mode.
- Legacy mode даёт воспроизводимые `MaxBt`/`MaxWl` по documented DSNP_PA formula.
- `sections.ts` учитывает ЦВК и не использует raw `radiusAt` там, где нужен snapshot/evaluator.
- Equipment containment использует одну и ту же геометрию, что и snapshot/rendering.
- `scene3d.ts`/`mesh.ts` пересобирают hull geometry при смене geometry mode; точность или приближение legacy 3D явно зафиксированы.
- Deprecated hull buoyancy module не представлен как реализация legacy geometry/full hull CB.
- Скруглённо-прямоугольный legacy section не входит в первый slice и отражён как follow-up.
- `npm run check:encoding`, `npm run test`, `npm run build` проходят.

## Настройки

- Testing: yes
- Logging: standard, без per-sample spam
- Docs: yes

## Roadmap Linkage

Milestone: `Добавить альтернативную legacy-геометрию обводов`

Rationale: это первая незакрытая веха roadmap после завершённой формализации DSNP_PA. Инкремент создаёт основу для последующих balance/inertia и full hull buoyancy задач без смешивания geometry contracts.

## Коммит

Не выполнять commit/push без отдельного разрешения пользователя.
