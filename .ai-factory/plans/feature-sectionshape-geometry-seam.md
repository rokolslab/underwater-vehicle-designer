# План реализации: SectionShape geometry seam

Ветка: `feature/sectionshape-geometry-seam`
Создан: 2026-08-04

## Original Request

SectionShape geometry seam

## Настройки

- Тестирование: да
- Логирование: standard
- Документация: да, обязательный completion docs checkpoint

## Связь с roadmap

Веха: "Обобщить геометрию сечений через `SectionShape`"
Обоснование: roadmap называет `SectionShape` следующей фазой перед расширением legacy DSNP_PA geometry mode и новыми инженерными моделями. Инкремент создаёт shape-aware seam для текущей ellipse без добавления `Priam`/`Kr`.

## Research Context

Source: `.ai-factory/RESEARCH.md` (Active Summary, Updated: 2026-08-03 20:45, SHA256: 81c730e327f55aa4f30ce609e52a865ad5468643eeab038f08cf7fd9a12b9cf5)

Тема: Сопоставление заявленной и фактической архитектуры и выбор целевой архитектуры проекта.

Цель: Подготовить эволюционный рефакторинг без полного rewrite, сохранив чистое расчётное ядро, единый координатный контракт и существующие regression tests.

Ограничения:
- Проект остаётся frontend-only Vite + TypeScript SPA без необходимости в microservices или backend.
- Body/SNAME-NED остаётся единственной современной доменной системой координат.
- Geometry, equipment, mass properties, hydrostatics и будущие инженерные расчёты должны оставаться чистыми TypeScript-модулями.
- Three.js, Canvas, DOM, browser files, logging и export являются adapters.
- Legacy DSNP_PA используется как reference и источник traceability, но не как API или единственный инженерный oracle.
- Рефакторинг должен быть поэтапным, без big-bang rewrite и без нарушения JSON migrations.

Решения:
- Целевая архитектура: Modular Monolith + Functional Core + Explicit Application Layer + Browser Adapters.
- Обобщить геометрию сечений через `SectionShape` и единый evaluator, чтобы ellipse и будущий rounded-rectangle `Priam`/`Kr` использовали одинаковые consumers.
- Rendering и export потребляют один производный geometry contract и не знают `geometryMode` formulas.
- Добавление rounded-rectangle section не требует отдельных веток в mesh, constraints и theoretical drawing.
- Потенциально циклические инженерные зависимости реализовывать через явный solver с convergence contract, а не через mutable state в `main.ts`.

Открытые вопросы:
- Какой точный contract выбрать для `SectionShape`: discriminated data union, набор pure functions или derived `HullGeometry` с evaluator methods.
- Какие compatibility aliases можно удалить сразу, а какие нужны для существующих JSON и внешних consumers.
- Следует ли вынести `constraints` в самостоятельный top-level core module или оставить под `equipment`.

Следующий шаг: Создать `/aif-plan full` для следующего increment: либо `SectionShape` как prerequisite legacy DSNP_PA `Priam`/`Kr`, либо дальнейшее сокращение `main.ts` через application controller/use-cases с сохранением explicit runtime commit ordering.

## Границы increment

Входит в scope:

- ввести `SectionShape` как derived geometry contract для текущих эллиптических сечений;
- добавить pure shape operations для bounds, area, containment, contour sampling и offsets/intersections, нужных mesh, constraints и theoretical drawing;
- сохранить compatibility fields `radius`, `halfBreadthY`, `halfHeightZ`, `topRadius`, `bottomRadius` для текущих таблиц, CSV/SVG и UI;
- перевести consumers с ellipse math на shape-aware helpers без ветвления по `geometryMode`;
- сохранить текущие численные результаты для `current-formula` и `legacy-dsnp-pa` ellipse modes;
- закрепить dependency/no-logger contracts и regression tests.

Не входит в scope:

- реализация rounded-rectangle, `Priam`, `Kr`, `Lcw` или новых legacy formulas;
- изменение JSON schema, migrations, UI controls или persisted project inputs;
- перенос каталогов в целевое дерево `core/`/`adapters/`;
- полноценный `HullGeometry` runtime object, watertight envelope, hydrostatics или volume/CB integration;
- переименование пользовательских метрик или удаление compatibility `radius`.

## Ключевые решения

- `SectionShape` в этом increment производит только `kind: "ellipse"`; будущие variants добавляются в одном shape module и не требуют новых branches в mesh/constraints/drawing consumers.
- Compatibility extents остаются рядом со shape, чтобы профиль, CSV, SVG и UI не меняли публичный формат.
- Shape operations живут в `src/modules/geometry/` и не импортируют DOM, Canvas, Three.js, persistence, UI или logger.
- Для текущих ellipse modes shape helpers обязаны давать битово/допусково совместимые значения с прежними формулами.
- Theoretical drawing data остаётся presentation-neutral; Canvas/SVG renderers получают готовые contour/intersection data или shape-derived primitives, но не знают `geometryMode`.
- Production logging не добавляется в pure geometry; adapter boundary logging остаётся у текущих владельцев ошибок.

## План коммитов

- **Коммит 1** (после задач 1-3): `refactor(geometry): add section shape seam`
- **Коммит 2** (после задач 4-6): `refactor(rendering): consume section shape geometry`
- **Коммит 3** (после задачи 7): `docs: document section shape workflow`

## Задачи

### Фаза 1: Pure SectionShape contract

- [x] **Задача 1: Добавить pure `SectionShape` contract и базовые ellipse operations**
  - Создать `src/modules/geometry/section-shape.ts` с `SectionShape`, `EllipseSectionShape`, factory/helper для ellipse, bounds/extents helpers, `sectionArea()`, `containsSectionPoint()`, `sampleSectionContour()`, waterline/buttock intersection helpers и устойчивой обработкой нулевых полуосей на носу/корме.
  - Не добавлять rounded-rectangle implementation; можно оставить type-level место только если все operations остаются exhaustive и тестируемыми без dead code.
  - Сохранить Body/SNAME-NED semantics: `y` — half-breadth/right board, `z` — down/up profile ordinate; helper names должны явно указывать координаты.
  - Добавить `src/modules/geometry/section-shape.test.ts`: area ellipse, containment boundary/inside/outside, contour sampling cardinality/order/axes, zero-section behavior, offset intersections and no console/log side effects.
  - **Логирование:** module и tests не импортируют `src/shared/logger.ts` и не вызывают `console.*`; ошибки выражаются return semantics или thrown programmer errors только там, где уже принято в geometry.
  - **Проверка:** targeted Vitest для `section-shape.test.ts`.
  - **Зависимости:** нет.

- [x] **Задача 2: Подключить shape к profile snapshot без изменения публичных profile extents**
  - Обновить `src/modules/geometry/model.ts`, `current-formula.ts`, `legacy-dsnp-pa.ts`, `profile.ts` и `sections.ts`, чтобы все section evaluations несли `shape` плюс прежние compatibility fields `radius`, `halfBreadthY`, `halfHeightZ`.
  - Сохранить `sectionExtentsAt()` как compatibility API только если есть реальные callers; внутренне он должен делегировать shape-aware evaluation, а не быть вторым владельцем ellipse math.
  - Перевести `sectionArea()` в `sections.ts` на `section-shape.ts`, сохранив текущую площадь `Math.PI * halfBreadthY * halfHeightZ` для ellipse.
  - Обновить `profile.test.ts`, `sections.test.ts`, `derive.test.ts` и fixtures только если shape field меняет snapshot serialization в tests; численные extents current/legacy должны остаться прежними.
  - **Логирование:** geometry evaluators остаются pure/logger-free; не логировать mode selection, extents или snapshot payloads.
  - **Проверка:** targeted Vitest для geometry profile/sections/application derive tests.
  - **Зависимости:** задача 1.

- [x] **Задача 3: Перевести equipment constraints на shape-aware containment**
  - Обновить `src/modules/equipment/constraints.ts`, чтобы containment использовал `containsSectionPoint()` и shape-bearing section data вместо локальной `ellipseValue()` math.
  - Сохранить текущий behavior для current/legacy ellipse modes, включая sample points, invalid equipment handling, warning codes/status и stable report ordering.
  - Убрать или переименовать user-facing diagnostic wording, которое жёстко обещает только «эллиптическое сечение», если оно становится фактически shape-agnostic; не менять русские UI messages без необходимости.
  - Обновить `constraints.test.ts`: ellipse regressions должны проходить через shape seam; добавить regression, что constraints не импортирует rendering/DOM/logger and does not recompute geometry outside allowed seam.
  - **Логирование:** constraints остаётся pure/logger-free; не добавлять logs для каждой sample point или outside check.
  - **Проверка:** targeted Vitest для equipment constraints, geometry shape/profile tests и dependency contract при наличии подходящего seam.
  - **Зависимости:** задача 2.

<!-- Commit checkpoint: задачи 1-3 -->

### Фаза 2: Drawing/rendering consumers

- [x] **Задача 4: Перевести pure theoretical drawing data на shape operations**
  - Обновить `src/modules/geometry/theoretical-drawing.ts`, чтобы buttock/waterline curves и body-plan section data строились через `SectionShape` operations, а не через локальные ellipse `sqrt(1 - ratio^2)` branches.
  - Сохранить layout-neutral drawing contract и compatibility fields `halfBreadthY`/`halfHeightZ` для масштаба, но добавить shape-derived contour/intersection data там, где это нужно Canvas/SVG adapters.
  - Обновить `theoretical-drawing.test.ts`: current ellipse expected curves остаются прежними, а tests проверяют, что source не дублирует ellipse equations вне shape helper.
  - **Логирование:** theoretical drawing data module остаётся pure/logger-free; не логировать station/curve arrays.
  - **Проверка:** targeted Vitest для geometry theoretical drawing и section-shape tests.
  - **Зависимости:** задачи 1-2.

- [x] **Задача 5: Перевести 3D mesh и theoretical drawing adapters на shape-derived contours**
  - Обновить `src/modules/rendering/mesh.ts`, чтобы ring vertices использовали `sampleSectionContour()` или equivalent shape operation; сохранить exact elliptical ring для текущих modes и обновить normals только в минимально необходимом объёме.
  - Обновить `src/modules/rendering/theoretical-drawing.ts` и `src/modules/persistence/theoretical-drawing-svg.ts`, чтобы body-plan drawing не строил section contours через локальные ellipse-only assumptions, если shape data уже доступна в `TheoreticalDrawing`.
  - Сохранить `scene3d.ts`, view settings и camera bounds на extents-based behavior; не переносить Three.js-specific logic в geometry.
  - Обновить `mesh.test.ts`, `scene3d.test.ts` при необходимости, `theoretical-drawing-svg.test.ts` и rendering theoretical drawing tests: ellipse outputs должны совпадать с прежними regressions.
  - **Логирование:** rendering adapters не логируют успешное построение каждого ring/section; существующие boundary errors не дублировать. Pure geometry helpers остаются без logger imports.
  - **Проверка:** targeted Vitest для mesh/rendering/theoretical SVG plus geometry shape tests.
  - **Зависимости:** задача 4.

- [x] **Задача 6: Закрепить extent-only consumers, exports и dependency contracts**
  - Проверить `src/modules/persistence/svg.ts`, `csv.ts`, `src/modules/ui/table.ts`, `metrics.ts`, `src/modules/rendering/canvas2d.ts`, `scene3dControls.ts` и `src/app/main.ts`: extent-only consumers должны явно использовать compatibility extents, а не shape formulas.
  - Обновить или добавить tests для CSV/SVG/table/metrics/canvas contracts только там, где shape field влияет snapshots или source contract.
  - Расширить `src/application/project/dependency-contract.test.ts` или добавить geometry-focused dependency assertion, чтобы `section-shape.ts`, profile/theoretical drawing core и constraints не импортировали DOM, Canvas, Three.js, persistence, UI или logger.
  - Выполнить targeted grep/source checks на отсутствие новых `geometryMode` branches в mesh, constraints, theoretical drawing Canvas/SVG and export paths, кроме mode selection owner в geometry profile/evaluators.
  - **Логирование:** не добавлять logs в extent-only pure/export helpers; если source checks используют spies, они должны проверять отсутствие console/logger side effects в core path.
  - **Проверка:** targeted Vitest для persistence SVG/CSV, UI table/metrics, canvas2d if covered, dependency contract and full focused shape consumer suite.
  - **Зависимости:** задачи 3-5.

<!-- Commit checkpoint: задачи 4-6 -->

### Фаза 3: Документация и full gates

- [x] **Задача 7: Синхронизировать context/docs и выполнить полные quality gates**
  - Обновить `AGENTS.md`, `.ai-factory/ARCHITECTURE.md`, `docs/architecture.md`, `docs/calculations.md` и `docs/testing.md` factual deltas: `SectionShape` seam, current ellipse-only implementation, compatibility extents, consumer ownership and no-logger/dependency rules.
  - Не закрывать roadmap milestone автоматически до `/aif-verify`; если implementation полностью завершит seam, roadmap update выполняется отдельным owner step или final docs checkpoint после verify.
  - Выполнить `docker compose run --rm app npm run check:encoding`, `docker compose run --rm app npm run test`, `docker compose run --rm app npm run build` и Playwright E2E через `docker compose -f compose.yml -f compose.e2e.yml run --rm e2e npm run test:e2e` при затронутых rendering/export flows.
  - Зафиксировать недоступный Playwright/browser gate как blocker, а не pass; app Alpine image не считать достаточным окружением для E2E, использовать e2e service.
  - **Логирование:** docs должны описывать, что pure geometry/constraints остаются logger-free; production logging policy не менять.
  - **Проверка:** full gates выше и финальный `git status`/diff review перед commit.
  - **Зависимости:** задачи 1-6.

<!-- Commit checkpoint: задача 7 -->

## Критерии приёмки

- `SectionShape` существует как pure derived geometry contract; текущие `current-formula` и `legacy-dsnp-pa` modes производят ellipse shapes.
- Mesh, equipment constraints, theoretical drawing data, theoretical Canvas/SVG and relevant exports use shape operations or shape-derived data, not duplicated ellipse formulas or `geometryMode` branches.
- Compatibility extents and existing JSON/project input contracts remain unchanged.
- Current formula and legacy ellipse numerical regressions remain stable within existing tolerances.
- Pure geometry, constraints and application derive closure remain browser-free, Three.js-free, persistence-free, UI-free and logger-free.
- Focused tests, full Vitest suite, build, encoding check and required E2E gate pass or blocker is explicitly recorded.
- Documentation accurately describes the current ellipse-only `SectionShape` seam and future rounded-rectangle extension point.

## Риски и меры

- **Риск:** shape field breaks many snapshot tests. **Мера:** keep compatibility extents stable, update tests only where structural shape data is intentionally exposed.
- **Риск:** duplicate ellipse math remains in consumers. **Мера:** source checks and targeted tests for mesh/constraints/theoretical drawing after migration.
- **Риск:** future rounded-rectangle is partially implemented without validation. **Мера:** this increment produces only ellipse shapes; future variants require separate plan and fixtures.
- **Риск:** 3D normals change visible rendering. **Мера:** preserve existing ellipse ring generation semantics and compare focused mesh tests before/after.
- **Риск:** theoretical drawing SVG output changes due to contour representation. **Мера:** retain exact ellipse regressions for current modes and treat output drift as blocker unless intentionally justified.
- **Риск:** geometry core imports adapter/logger dependencies through helper reuse. **Мера:** dependency-contract tests and no-console/no-logger assertions.
