# Исследование

Обновлено: 2026-07-31 09:58
Статус: активно

## Активное резюме для `/aif-plan`
<!-- aif:active-summary:start -->
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
- Не использовать строгие Vertical Slices как основной стиль: общие расчётные capabilities нужны нескольким UI/export/rendering сценариям.
- Не вводить полную Clean/Hexagonal Architecture с repository/service abstraction: для текущего browser-only приложения это избыточно.
- Ввести канонический `ProjectInputs` и единый `ProjectStore`; DOM перестаёт быть источником истины.
- Ввести чистый `deriveProject(projectInputs)`, возвращающий geometry snapshot, constraints, mass/balance results и presentation-neutral drawing data.
- Разделить сохраняемые `ProjectInputs`, локальный `ProjectViewState`, производный `ProjectEvaluation` и versioned persistence DTO `ProjectDocumentV3`.
- Объединить DOM- и JSON-нормализацию вокруг общих pure normalizers.
- Разделить `HullDefinition` и `ProfileViewSettings`; compatibility aliases держать только на migration/export boundaries.
- Обобщить геометрию сечений через `SectionShape` и единый evaluator, чтобы ellipse и будущий rounded-rectangle `Priam`/`Kr` использовали одинаковые consumers.
- Явно различать `HydrodynamicFairing`, `PlacementEnvelope`, `StructuralMassModel` и `WatertightEnvelope`.
- Разделить текущий широкий `balance` на mass properties, buoyancy/hydrostatics и stability diagnostics по мере развития.
- Будущие comparison, hydrodynamics, energy и cost оформлять отдельными pure capabilities.
- Потенциально циклические инженерные зависимости реализовывать через явный solver с convergence contract, а не через mutable state в `main.ts`.

Подтверждённые проблемы:
- `main.ts` совмещает composition root, application controller, import workflow, derived calculations и render orchestration.
- Состояние распределено между DOM controls, module-level variables и closures; `ProjectState` собирается заново при каждом `update()`.
- Профиль независимо нормализуется в `appState.ts` и `project-json.ts`.
- `ProfileState` смешивает domain inputs, производные compatibility aliases и display settings.
- Constraints пересчитывает current-formula sections из state, но интерполирует legacy sections из snapshot.
- Domain-like модули имеют logging side effects через Vite-aware global logger.
- После импорта возможен duplicate equipment ID из-за несинхронизированного ID generator.
- Импортированное `gravityMPerS2` теряется: application layer заменяет его default-константой.
- `ProjectState` и `SerializableProjectState` дублируют один aggregate contract.
- `constraints.ts`, `scene3d.ts` и `main.ts` имеют несколько независимых ответственностей.
- Canvas и SVG реализации теоретического чертежа частично дублируют layout/projection logic.

Открытые вопросы:
- Должен ли `ProjectViewState` входить в основной JSON-документ или сохраняться отдельной секцией с независимой версией.
- Нужен ли минимальный custom store/reducer или достаточно application controller с immutable state и `dispatch`.
- Какой точный contract выбрать для `SectionShape`: discriminated data union, набор pure functions или derived `HullGeometry` с evaluator methods.
- Какие compatibility aliases можно удалить сразу, а какие нужны для существующих JSON и внешних consumers.
- Следует ли вынести `constraints` в самостоятельный top-level core module или оставить под `equipment`.
- Как формализовать provenance, validity, uncertainty и единицы до реализации hydrodynamics/energy.
- Какой buoyancy discriminator нужен для equipment-only, watertight envelope и composite modes без double counting.

Сигналы успеха:
- Import заменяет project state атомарно и не использует DOM как промежуточное хранилище.
- Import → add equipment сохраняет уникальность ID; import → export сохраняет gravity.
- `main.ts` содержит только bootstrap, wiring и подписки adapters.
- Все изменения проекта проходят через команды/reducer или эквивалентный единый application API.
- DOM и JSON используют одни pure normalizers.
- Geometry, equipment constraints, mass properties и hydrostatics не импортируют logger, DOM, Canvas, Three.js или Vite runtime.
- Rendering и export потребляют один производный geometry contract и не знают `geometryMode` formulas.
- Добавление rounded-rectangle section не требует отдельных веток в mesh, constraints и theoretical drawing.
- Архитектурные dependency rules проверяются тестом или статическим инструментом.

Следующий шаг: Создать `/aif-plan full` для поэтапного рефакторинга, начиная с data-integrity tests, канонического `ProjectInputs`, общего normalization pipeline и чистого `deriveProject()`.
<!-- aif:active-summary:end -->

## Сессии
<!-- aif:sessions:start -->
### 2026-07-31 09:58 — Целевая архитектура проекта
Что изменилось: Сопоставлены `.ai-factory/ARCHITECTURE.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ROADMAP.md`, `AGENTS.md`, `docs/architecture.md`, `TECHNICAL_SPEC.md`, legacy integration roadmap и фактические зависимости TypeScript-кода. Выбрано направление эволюции к модульному монолиту с functional core, explicit application state и browser adapters.

Ключевые заметки:
- Текущий import graph ацикличен; Three.js и большая часть browser API уже локализованы в adapters.
- Термин Vertical Slices в документации неточен: текущая структура сочетает domain capabilities и technical adapters.
- Главный архитектурный долг — отсутствие канонического application state, а не расположение файлов.
- Первый выгодный seam: `ProjectInputs` + `ProjectStore` + `deriveProject()`.
- До расширения legacy geometry необходим общий `SectionShape`; текущих `halfBreadthY`/`halfHeightZ` недостаточно для `Priam`/`Kr`.
- Полный ЦВ требует отдельных contracts для проницаемого fairing и watertight envelope.
- Найдены два первоочередных data-integrity дефекта: duplicate equipment ID после import и потеря импортированной gravity.

Ссылки:
- `.ai-factory/ARCHITECTURE.md`
- `.ai-factory/DESCRIPTION.md`
- `.ai-factory/ROADMAP.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/legacy/dsnp-pa-integration-roadmap.md`
- `TECHNICAL_SPEC.md`
- `src/app/main.ts`
- `src/app/appState.ts`
- `src/app/projectState.ts`
- `src/modules/geometry/model.ts`
- `src/modules/geometry/profile.ts`
- `src/modules/equipment/constraints.ts`
- `src/modules/persistence/project-json.ts`
<!-- aif:sessions:end -->
