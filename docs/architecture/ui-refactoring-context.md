# Архитектурный контекст рефакторинга для обсуждения будущего UI

Дата: 2026-07-31

Статус: аналитический документ. Исходный код, UI, зависимости, JSON-схема и расчётные формулы в рамках подготовки документа не изменялись.

Путь выбран по запросу задачи: `docs/architecture/ui-refactoring-context.md`. В репозитории уже есть обзорный документ `docs/architecture.md`; новый каталог `docs/architecture/` используется для более узкого архитектурного материала, который не должен перегружать обзорную страницу.

## 1. Резюме

Планируемый рефакторинг нужен не для немедленного изменения внешнего вида, а для отделения инженерной модели приложения от DOM, Canvas, Three.js и форм ввода. Сейчас приложение работает как единая frontend-only SPA, но фактический orchestration layer сосредоточен в `src/app/main.ts`, а состояние распределено между DOM controls, runtime-переменными и экспортным aggregate `ProjectState`.

Главная архитектурная проблема: в проекте нет канонического application state и единого контракта изменения состояния. Пользовательский ввод сейчас часто проходит путь `DOM -> readState() -> расчёты -> render`, а импорт JSON частично записывает значения в DOM и затем заново читает их через общий update cycle. Это усложняет будущие UI-сценарии: Undo/Redo, dirty state, autosave, выбор объектов в 2D/3D, локальные пересчёты и независимое обновление панелей.

Принятое целевое направление в `.ai-factory/ARCHITECTURE.md` и `.ai-factory/RESEARCH.md`: Modular Monolith + Functional Core + Explicit Application Layer + Browser Adapters. Расчёты должны оставаться чистыми TypeScript-модулями, приложение должно получить канонические `ProjectInputs`, общий normalization pipeline, application API или store и чистую функцию производных данных наподобие `deriveProject()`.

Будущий UI зависит от рефакторинга не полностью. Уже сейчас можно обсуждать назначение продукта, терминологию, структуру рабочей среды, основные панели, разделение landing page и workbench, визуальную иерархию, desktop/mobile сценарии и способы показа предупреждений. До архитектурных решений лучше отложить Undo/Redo, автосохранение, несколько открытых проектов, дерево оборудования, двустороннее редактирование в сцене, сохранение view state в JSON и окончательный выбор UI-framework.

Ключевое ограничение для UI: интерфейс не должен становиться источником инженерной истины. Он должен отображать нормализованные inputs, structured reports и view models, а не дублировать геометрические формулы, координатные преобразования или расчётные правила.

## 2. Источники анализа

Изученные инструкции и AI Factory материалы:

- `AGENTS.md`: карта проекта, координатный контракт Body/SNAME-NED, термины `ЦВК` и `ЦВ`, правила модульных границ.
- `.ai-factory/DESCRIPTION.md`: назначение проекта, стек, текущие возможности.
- `.ai-factory/ARCHITECTURE.md`: целевое направление Modular Monolith + Functional Core + Explicit Application Layer + Browser Adapters, desired flow `DOM event -> application command -> ProjectStore -> deriveProject()`.
- `.ai-factory/RESEARCH.md`: текущие seams рефакторинга, риски data integrity, DOM-backed import, duplicated normalization, logger side effects.
- `.ai-factory/RULES.md` и `.ai-factory/rules/base.md`: правила терминологии, координат, разделения расчётов и UI.
- `.ai-factory/config.yaml`: структура AI Factory.
- `.ai-factory/ROADMAP.md`: целевые расширения и roadmap-направления.

Изученные планы и заметки:

- `.ai-factory/plans/feature-public-demo-v1-site.md`: scope публичного demo и ограничения обещаний пользователю.
- `.ai-factory/plans/feature-elliptical-section-dimensions.md`: переход от радиуса к независимым `breadth`/`height`, влияние на 2D/3D и расчёты.
- `.ai-factory/plans/feature-hull-center-of-buoyancy.md`: будущая тема полного ЦВ корпуса, не смешивать с текущим equipment-only balance.
- `.ai-factory/plans/fix-cvk-terminology-and-geometry.md`: терминология ЦВК и геометрические ограничения.
- `.ai-factory/archive/plans/feature-sname-ned-coordinate-migration.md`: миграция координат на Body/SNAME-NED и JSON v2.

Изученная документация:

- `README.md`: пользовательское назначение, current-formula и legacy DSNP_PA режимы, текущие возможности.
- `TECHNICAL_SPEC.md`: baseline 3D-версии, остаточные требования, ограничения расчётов.
- `docs/architecture.md`: текущая архитектура, целевые границы, refactoring seams.
- `docs/ui-ux.md`: текущий UI/UX, сценарии и ограничения публичного интерфейса.
- `docs/calculations.md`: геометрия, оборудование, constraints, balance, координаты.
- `docs/data-and-export.md`: JSON v1/v2, CSV, SVG, project export/import.
- `docs/testing.md`: тестовые сценарии и smoke checks.
- `docs/legacy/dsnp-pa-system-map.md`, `docs/legacy/dsnp-pa-data-model.md`, `docs/legacy/dsnp-pa-calculation-catalog.md`, `docs/legacy/dsnp-pa-integration-roadmap.md`: контекст legacy DSNP_PA и будущей интеграции.

Ключевые исходные файлы:

- `index.html`: Vite HTML shell.
- `src/app/main.ts`: composition root, DOM lookup, update loop, import/export, rendering orchestration.
- `src/app/appState.ts`: DOM-backed чтение и нормализация profile inputs.
- `src/app/projectState.ts`: frozen aggregate для profile/equipment/scene3d/balance settings.
- `src/modules/geometry/model.ts`: `GeometryMode`, `ProfileState`, `SectionExtents`, `ProfileSnapshot`.
- `src/modules/geometry/profile.ts`: `makeProfileSnapshot()`, `sectionExtentsAt()`.
- `src/modules/geometry/current-formula.ts`: current-formula geometry и ЦВК.
- `src/modules/geometry/legacy-dsnp-pa.ts`: legacy DSNP_PA evaluator.
- `src/modules/geometry/theoretical-drawing.ts`: pure данные теоретического чертежа.
- `src/modules/equipment/model.ts`: `EquipmentItem`, формы, объём, центр, displaced volume.
- `src/modules/equipment/placement.ts`: add/update/delete/rename оборудования, генератор ID.
- `src/modules/equipment/constraints.ts`: containment/intersection checks и `EquipmentConstraintReport`.
- `src/modules/balance/equipment-balance.ts`: equipment-only balance.
- `src/modules/balance/stability.ts`: BG, deltas и moments.
- `src/modules/rendering/canvas2d.ts`: Canvas side profile.
- `src/modules/rendering/scene3d.ts`, `src/modules/rendering/mesh.ts`, `src/modules/rendering/equipment3d.ts`: Three.js scene, hull mesh, equipment meshes.
- `src/modules/rendering/coordinate-adapter.ts`: Body-to-Three и projection adapters.
- `src/modules/rendering/viewSettings.ts`: нормализация 3D settings.
- `src/modules/persistence/project-json.ts`: JSON v2 build/parse.
- `src/modules/persistence/project-json-migrations.ts`: v1 -> v2 coordinate migration.
- `src/modules/persistence/csv.ts`, `src/modules/persistence/svg.ts`, `src/modules/persistence/theoretical-drawing-svg.ts`: exports.
- `src/modules/ui/equipment.ts`, `src/modules/ui/metrics.ts`, `src/modules/ui/scene3dControls.ts`, `src/modules/ui/table.ts`: DOM UI modules.
- `src/shared/body-coordinates.ts`: Body/Profile coordinate model.
- `src/shared/logger.ts`: Vite-aware logger, который сейчас импортируется некоторыми domain-like модулями.

Изученные тесты:

- `src/shared/body-coordinates.test.ts`.
- `src/app/appState.test.ts`, `src/app/dom-contract.test.ts`.
- `src/modules/geometry/*.test.ts`.
- `src/modules/equipment/*.test.ts`.
- `src/modules/balance/*.test.ts`.
- `src/modules/rendering/*.test.ts`.
- `src/modules/persistence/*.test.ts`.
- `src/modules/ui/*.test.ts`.
- `tests/fixtures/`: fixture-данные, включая регрессии по `formula.xlsx`.

Git-контекст:

- Текущая ветка при анализе: `master`.
- `master` синхронизирован с `origin/master` по данным обзора.
- Релевантная remote branch: `origin/feature/public-demo-v1-site`.
- Релевантные коммиты в недавней истории: `ec9246b refactor(coordinates): establish sname ned domain model`, `0bc9169 feat(geometry): add legacy dsnp pa mode`, `993be90 feat(geometry): support section breadth and height`, `a719a45 feat(ui): redesign public demo interface`, `8da6295 chore(aif): refresh project context and tooling`.

## 3. Текущее архитектурное состояние

Точка входа приложения:

- `index.html` загружает `/src/app/main.ts` как Vite entrypoint.
- `src/app/main.ts` является фактическим composition root и application controller.

Orchestration layer сейчас сосредоточен в `src/app/main.ts`. Этот файл выполняет сразу несколько ролей: DOM lookup, binding событий, runtime state, чтение форм, запуск расчётов, импорт/экспорт, canvas rendering, Three.js rendering, equipment editor rendering, focus preservation и resize lifecycle.

Расчётные модули в целом уже отделены от DOM:

- `src/modules/geometry/*` строит профиль, станции, extents и данные теоретического чертежа.
- `src/modules/equipment/model.ts` считает объёмы и центры оборудования.
- `src/modules/equipment/constraints.ts` проверяет выход за корпус и пересечения.
- `src/modules/balance/equipment-balance.ts` считает equipment-only CG/CB/weight/buoyancy/moments.
- `src/modules/balance/center-of-buoyancy.ts` содержит устаревший current-formula-only hull CB и не является реализацией полного ЦВ герметичного корпуса.

Модель состояния фактически распределена:

- Profile inputs живут в DOM и читаются/нормализуются через `createAppStateController()` в `src/app/appState.ts`.
- `equipmentItems` хранится как runtime-переменная в `src/app/main.ts`.
- 3D settings читаются из DOM через `src/modules/ui/scene3dControls.ts` и нормализуются через `src/modules/rendering/viewSettings.ts`.
- Balance settings частично читаются из DOM: плотность воды берётся из input, а gravity сейчас подставляется из `DEFAULT_GRAVITY_M_PER_S2` в `src/app/main.ts`.
- `ProjectState` из `src/app/projectState.ts` создаётся заново при каждом update и используется как aggregate для JSON export, но не является каноническим store.

Управление оборудованием:

- Предметная модель: `EquipmentItem` в `src/modules/equipment/model.ts`.
- Формы: `sphere`, `cylinder`, `box`.
- Оси цилиндра: `x`, `y`, `z` в Body/SNAME-NED.
- Операции add/update/delete/rename находятся в `src/modules/equipment/placement.ts` и возвращают immutable/frozen arrays.
- Генератор ID находится в module-level переменной `nextGeneratedId`, а не в application state.

Расчёт ограничений:

- `evaluateEquipmentConstraints(snapshot, items)` из `src/modules/equipment/constraints.ts` использует `ProfileSnapshot`.
- Проверяются валидность оборудования, продольные bounds, попадание в эллиптическое сечение и пересечения.
- Для UI важно, что report уже содержит статусы и issues, пригодные для отображения в списке, 2D и 3D.
- Нежелательная связь: calculation module содержит пользовательские сообщения на русском языке и импортирует logger.

Расчёт баланса:

- `calculateEquipmentBalance()` в `src/modules/balance/equipment-balance.ts` считает только equipment-only balance.
- `buoyancyModel` сейчас равен `equipmentDisplacedVolume`.
- CB взвешивается по displaced volume оборудования, а не по внешней герметичной оболочке.
- Это обязательно должно быть явно отражено в UI, чтобы не создавать впечатление полного гидростатического расчёта аппарата.

Canvas 2D:

- `renderCanvasProfile(canvas, snapshot, equipment, report)` в `src/modules/rendering/canvas2d.ts` рисует XZ-профиль, сетку, станции и equipment overlay.
- Рендер использует `ProfileSnapshot`, не пересчитывает геометрию самостоятельно.

Three.js:

- `createHullScene3d(container)` в `src/modules/rendering/scene3d.ts` создаёт сцену.
- `buildHullMeshData(snapshot)` в `src/modules/rendering/mesh.ts` строит эллиптические rings по `halfBreadthY` и `halfHeightZ`.
- `src/modules/rendering/equipment3d.ts` создаёт equipment meshes и signatures.
- Внутри 3D есть оптимизация: hull/equipment meshes пересоздаются только при изменении signature.

Теоретический чертёж:

- Pure data создаётся в `src/modules/geometry/theoretical-drawing.ts` через `makeTheoreticalDrawing(snapshot)`.
- Canvas-rendering находится в `src/modules/rendering/theoretical-drawing.ts`.
- SVG export находится в `src/modules/persistence/theoretical-drawing-svg.ts`.

Persistence:

- JSON v2 строится и читается в `src/modules/persistence/project-json.ts`.
- JSON v1 мигрируется в `src/modules/persistence/project-json-migrations.ts`.
- CSV/SVG exports используют `ProfileSnapshot` или `TheoreticalDrawing`, что хорошо поддерживает единый источник геометрии.

UI-модули:

- `src/modules/ui/equipment.ts`: rendering и чтение updates из equipment editor.
- `src/modules/ui/table.ts`: таблица станций.
- `src/modules/ui/metrics.ts`: метрики и предупреждения баланса.
- `src/modules/ui/scene3dControls.ts`: DOM controls 3D.

Обработка событий и общий update cycle:

```text
DOM event
  -> update(source)
  -> appState.readState(source)
  -> makeProfileSnapshot(profile)
  -> makeTheoreticalDrawing(snapshot)
  -> evaluateEquipmentConstraints(snapshot, equipmentItems)
  -> normalizeScene3dSettings(readScene3dControls(), bounds)
  -> makeProjectState(profile, equipment, scene3dSettings, balanceSettings)
  -> calculateEquipmentBalance(project-derived input)
  -> renderCanvasProfile()
  -> renderTheoreticalDrawing()
  -> renderEquipmentEditor()
  -> renderTable()
  -> renderBalanceMetrics()
  -> hullScene3d.render()
```

Что уже разделено хорошо:

- Координатные преобразования вынесены в `src/shared/body-coordinates.ts` и `src/modules/rendering/coordinate-adapter.ts`.
- Geometry snapshot является общим источником для canvas/table/SVG/3D.
- JSON v1 -> v2 migration отделена от основного парсинга.
- Three.js изолирован в `src/modules/rendering/*`, а не размазан по UI.
- Большинство расчётных модулей не используют DOM.

Нежелательные связи:

- `src/app/main.ts` слишком широкий и содержит application logic, browser adapters и rendering orchestration одновременно.
- `src/app/appState.ts` читает и пишет DOM, поэтому DOM участвует в state model.
- JSON import в `applyImportedProject()` из `src/app/main.ts` записывает часть данных в controls и затем вызывает общий update.
- `src/modules/geometry/profile.ts`, `src/modules/equipment/placement.ts`, `src/modules/equipment/constraints.ts`, `src/modules/balance/equipment-balance.ts` импортируют `src/shared/logger.ts`, а logger завязан на `import.meta.env`.
- `src/modules/persistence/project-json.ts` использует `normalizeScene3dSettings()` из rendering, что смешивает persistence DTO и rendering settings.
- `src/modules/equipment/constraints.ts` пока знает о `geometryMode` и частично пересчитывает current-formula sections через state.

Где UI напрямую связан с расчётами или DOM:

- `src/app/main.ts` напрямую вызывает расчёты и renderers.
- `src/app/appState.ts` совмещает нормализацию предметных параметров с записью в DOM controls.
- `src/modules/ui/equipment.ts` читает DOM event и формирует equipment updates.

Где один пользовательский ввод вызывает избыточное обновление:

- Изменение только плотности воды вызывает полный geometry/constraints/render pipeline.
- Изменение только 3D opacity/section вызывает полный update, хотя domain geometry и balance не должны меняться.
- Изменение имени оборудования вызывает пересчёт geometry, theoretical drawing, constraints, balance и full UI render.
- Ввод в equipment editor перерисовывает весь editor через `innerHTML`, а focus восстанавливается вручную.

## 4. Цель рефакторинга

Уже принятые решения:

- Архитектурное направление: Modular Monolith + Functional Core + Explicit Application Layer + Browser Adapters, основание: `.ai-factory/ARCHITECTURE.md`.
- Расчётная геометрия, equipment, balance и coordinate logic должны оставаться чистыми TypeScript-модулями без DOM/canvas/browser side effects, основание: `AGENTS.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/RULES.md`.
- DOM не должен быть источником истины, основание: `.ai-factory/RESEARCH.md` и `docs/architecture.md`.
- Все views и exports должны использовать общий `ProfileSnapshot` или будущий аналог, основание: `AGENTS.md`, `docs/architecture.md`, текущий код `src/modules/geometry/profile.ts`.

Предполагаемые решения:

- Ввести canonical `ProjectInputs`, который хранит проектные данные независимо от DOM.
- Ввести общий normalization pipeline для DOM input и JSON import.
- Ввести `ProjectStore`, reducer или application controller с явными commands/use cases.
- Ввести pure `deriveProject(projectInputs)` для `ProjectEvaluation`: geometry snapshot, drawing, constraints, balance, reports, availability states.
- Сократить `src/app/main.ts` до bootstrap/wiring/subscriptions.

Рекомендации:

- UI должен обращаться к application layer через команды или use cases, а не напрямую мутировать objects.
- Derived calculations должны быть read-only результатами, а не частью editable state.
- Для UI лучше подготовить presentation/read models со статусами, форматированными значениями, units и reasons, а не отдавать только raw domain objects.
- Normalization should happen before derive/render, а не внутри DOM controls.

Открытые вопросы:

- Нужен ли custom store/reducer, command bus, простой application controller или другая форма API.
- Будет ли state immutable целиком или частично.
- Какие действия войдут в command history для Undo/Redo.
- Должен ли `ProjectViewState` сохраняться в JSON проекта.
- Где будут храниться selected/hovered objects и transient form drafts.
- Какой точный contract заменит `SectionExtents`: `SectionShape`, `HullGeometry` evaluator или другой интерфейс.

Что должно стать проще тестировать:

- Import/export без DOM.
- Dirty state и сохранение.
- Изменения отдельных inputs через commands.
- Локальные пересчёты: geometry-only, balance-only, rendering-only.
- Reports для UI: validation, constraints, balance warnings.
- Undo/Redo, если будет принято.

Что должно стать проще расширять:

- Новые geometry modes и `SectionShape`.
- Mass properties, watertight envelope и full hydrostatics.
- Equipment groups/systems, если будут приняты.
- 2D/3D interactions и selection synchronization.
- Autosave/recent projects/multiple projects, если будут приняты.

## 5. Целевые слои и их ответственность

Имена слоёв ниже являются аналитической проекцией на уже принятое направление. Документы репозитория фиксируют не названия каталогов как самоцель, а границы зависимостей: core/application/adapters/UI.

| Слой | Ответственность | Может зависеть от | Не должен зависеть от | Значение для UI |
| ---- | --------------- | ----------------- | --------------------- | --------------- |
| Shared/kernel | Координаты, единицы, pure math, базовые типы, branded/domain primitives при необходимости | Ничего прикладного или только standard TS | DOM, Canvas, Three.js, persistence, UI | Даёт единый язык координат, единиц и ограничений |
| Domain/core | Геометрия корпуса, оборудование, mass properties, constraints, balance/hydrostatics как pure logic | Shared/kernel | DOM, UI controls, rendering, browser APIs, JSON adapters, logger с side effects | UI не дублирует формулы, а отображает domain results |
| Project state | Канонические project inputs, metadata, view/persistence boundaries | Shared/kernel, domain types | DOM как store, renderers | Определяет, что является сохраняемым проектом |
| Application/use cases | Commands, normalization, import apply, dirty tracking, derive orchestration, validation pipeline | Domain/core, project state, persistence DTO types через ports | Canvas/Three implementation details, direct DOM mutation | Основной контракт UI: изменить корпус, добавить оборудование, выбрать объект, сохранить |
| Presentation/view models | Read models, structured reports, formatted values, action availability, blocking reasons | Application results, format helpers | Domain mutations, DOM direct reads as source of truth | UI получает готовые данные для панелей, таблиц, warnings и disabled states |
| Rendering | Canvas 2D, Three.js, theoretical drawing rendering, mesh generation, coordinate adapters | Profile/evaluation read models, rendering settings | Application commands кроме callback boundaries, persistence ownership | UI может включать/выключать views и синхронизировать selection |
| UI | Layout, controls, panels, interactions, keyboard/touch, forms | Application API, presentation models, renderer adapters | Geometry formulas, direct persistence schema ownership, direct domain mutation | Свободнее проектировать интерфейс без риска сломать расчёты |
| Persistence/infrastructure | JSON/CSV/SVG encode/decode, migrations, file download, future local storage | DTOs, migration helpers, application ports | DOM controls as intermediate state, renderer internal state except export inputs | Определяет save/open/export UX, backward compatibility и warnings |

Данные, которые предоставляет UI:

- Raw пользовательские drafts: строки/числа из форм, выбранные опции, pointer/keyboard actions.
- User intent: команды наподобие изменить размерение корпуса, добавить оборудование, выбрать объект.
- Transient interaction state: selected/hovered/active panel, если оно не хранится внутри application store.

Действия, которые может инициировать UI:

- Создание/открытие/сохранение проекта.
- Изменение project inputs.
- Изменение view settings.
- Выбор, hover, focus и scene interactions.
- Export actions.
- Undo/Redo, если command history будет принят.

## 6. Изменения предметной модели

| Сущность | Сейчас | Входит в планируемый рефакторинг | Возможное изменение структуры | UI-представление | Нерешённые вопросы |
| -------- | ------ | -------------------------------- | ----------------------------- | ---------------- | ------------------ |
| Проект | `ProjectState` aggregate в `src/app/projectState.ts`, JSON document v2 | Да | Перейти к canonical `ProjectInputs` и separate `ProjectEvaluation` | Project header, save/open status, metadata | Имя, описание, project ID, dates, dirty state не приняты |
| Корпус | `ProfileState` в geometry model | Да | Разделить inputs, derived geometry и будущие envelopes | Панель размерений и режима геометрии | Как представлять несколько физических моделей корпуса |
| Геометрическая модель | `current-formula` и `legacy-dsnp-pa` | Да | Ввести `SectionShape` или аналог | Выбор режима, объяснение ограничений модели | Точный contract не принят |
| Режим геометрии | `GeometryMode` union | Да | Возможно расширение legacy beyond elliptical first slice | Select/segmented control, diagnostics | Priam/Kr и будущие режимы не утверждены |
| Станции и профиль | `ProfileSnapshot`, `stationPoints`, `smoothPoints` | Да, как stable read model или аналог | Может перейти к shape-based sections | Таблица координат, графика 2D, exports | Как показывать non-ellipse sections в будущем |
| Оборудование | Flat list `EquipmentItem[]` | Да | Возможен переход к groups/systems, но не принят | Список, inspector, selection | Группы/системы/дерево не приняты |
| Формы оборудования | `sphere`, `cylinder`, `box` | Возможно | Новые типы компонентов не приняты | Shape selector и shape-specific fields | Какие CAD-like shapes нужны дальше |
| Положение и размеры | Body coordinates, dimensions per shape | Да | Возможны manipulators/gizmos позже | Numeric inspector, 2D/3D handles в будущем | Direct manipulation не принято |
| Ограничения | `EquipmentConstraintReport` | Да | Structured reports без UI strings в core | Badges, warnings, highlight в 2D/3D | Где хранить localized messages |
| Масса | `massKg` per item | Да | Mass groups/structural mass model в будущем | Поля массы, summaries | Группы масс и tensor inertia не реализованы |
| Вытесненный объём | По форме оборудования | Да | Отделить equipment displaced volume от watertight envelope | Balance panel с явной моделью | Как избежать double counting |
| Центр тяжести | Equipment-only CG | Да | Full mass properties позже | CG marker, metrics | Structural mass model не принят |
| Центр величины | Equipment-only CB в balance; deprecated hull CB отдельно | Да, но full CB позже | `BuoyancyModel` discriminator нужен | CB marker с подписью ограниченности | Watertight envelope не реализован |
| Балласт | Нет отдельной модели | Не решено | Может быть equipment subtype или отдельная модель | Не проектировать детально пока | Scope и расчётная модель не приняты |
| Оболочка/масса конструкции | Нет | Future target | StructuralMassModel | Не утверждать UI до модели | Какие параметры нужны неизвестно |
| Параметры воды | Только density UI + default gravity | Да | Balance settings в canonical state | Поля среды/условий | Gravity import currently not live; future fields не приняты |
| Расчётные результаты | Derived во время `update()` | Да | `ProjectEvaluation`/reports | Results panels, statuses | Нужно ли calculating/stale/error для sync/async |
| Предупреждения и ошибки | Constraints issues, balance warnings, import warnings | Да | Structured codes + localized presentation | Persistent diagnostics area | Уровни severity и provenance не формализованы |
| Варианты проекта | Нет | Не решено | Может потребовать multi-document/variant model | Не проектировать как принятое | Нужно ли comparison workflow |
| Метаданные проекта | `exportedAt` в JSON root, schema metadata | Возможно | name, description, createdAt, modifiedAt | Project settings/header | Не принято |

Переход от плоского списка оборудования к группам, системам, дереву проекта, вложенным объектам, агрегатам или нескольким типам компонентов не является принятым решением. Документы указывают mass groups и более точные CAD-подобные checks как будущие расширения, но конкретная предметная структура не утверждена. UI-специалист может обсуждать место для будущего дерева/систем, но не должен считать его обязательной моделью.

## 7. Модель состояния приложения

Единого состояния проекта сейчас нет. Есть несколько источников:

- DOM controls профиля, читаемые `src/app/appState.ts`.
- Runtime-переменная `equipmentItems` в `src/app/main.ts`.
- DOM controls 3D, читаемые `src/modules/ui/scene3dControls.ts`.
- DOM input плотности воды и constant gravity в `src/app/main.ts`.
- Derived runtime-переменные `currentSnapshot`, `currentTheoreticalDrawing`, `currentConstraintReport`, `currentBalanceResult`, `currentProjectState`.

После рефакторинга project state должен находиться в application layer, а DOM должен стать adapter/input surface. Предполагаемый центр: `ProjectInputs` плюс отдельные slices для view state, interaction state и persistence state. Точное API не принято.

Предметное состояние проекта:

- Размерения корпуса, режим геометрии, ЦВК, станции.
- Оборудование, его масса, объёмные размеры и положение.
- Balance/environment settings: water density, gravity, будущие параметры воды.
- Будущие metadata: имя, описание, createdAt/modifiedAt, если будут приняты.

Результаты расчётов:

- `ProfileSnapshot` или будущий geometry evaluation.
- `TheoreticalDrawing` data.
- Equipment constraints report.
- Equipment balance result.
- Future mass properties, hydrostatics, stability, provenance/validity.

Состояние представления:

- 2D view settings: сетка, точки, возможно zoom/pan в будущем.
- 3D view mode, opacity, clipping section.
- Camera parameters: сейчас находятся внутри Three.js scene instance и не входят в JSON; будущее хранение не принято.
- Открытые панели и вкладки: сейчас это layout/DOM state, не project state; хранение не принято.

Состояние текущего взаимодействия:

- Selected equipment/project object: сейчас полноценного централизованного selected state нет.
- Hover, focused field, active drag/gizmo: сейчас частично локально в DOM/focus restoration.
- Draft values форм: сейчас form values сразу участвуют в update; отдельные drafts от подтверждённой модели не реализованы.

Состояние хранения и сохранения:

- JSON export создаётся из `ProjectState`.
- Dirty state, autosave, recent projects, project ID и protection от потери несохранённых изменений не реализованы и не приняты.
- Возможность нескольких одновременно открытых проектов не реализована и не принята.

Undo/Redo:

- Не реализованы.
- Не принято, нужна ли command history.
- Если будут нужны, UI-контракт должен стать command-based или reducer-based до дизайна interaction history.

## 8. Способ изменения состояния

Сейчас UI напрямую влияет на state через DOM: user input изменяет controls, затем `update()` читает DOM и заново собирает derived state. Equipment operations обновляют runtime array в `main.ts`. Это работает для текущего demo, но плохо подходит для сложного UI.

Рекомендуемый контракт: UI вызывает application commands/use cases. Commands принимают input payload, application layer нормализует значения, обновляет canonical state, запускает derive pipeline и публикует read models для UI/renderers. Точный механизм не принят: это может быть reducer, store с `dispatch`, application controller или минимальный command API.

| Операция | Входные данные | Изменяемое состояние | Вызываемые расчёты | Обновляемые представления |
| -------- | -------------- | -------------------- | ------------------ | ------------------------- |
| Создать новый проект | Шаблон или defaults | Project inputs, metadata, view defaults | Geometry, constraints, balance | Все панели, 2D, 3D, таблица, metrics |
| Открыть проект | JSON/file document | Project inputs через migration/normalization | Geometry, constraints, balance | Все views, import warnings |
| Сохранить проект | Current project inputs | Persistence state, dirty marker | Не обязательно | Save status |
| Изменить размерения корпуса | length/breadth/height/slenderness | Profile inputs | Geometry, theoretical drawing, constraints, balance placement context | 2D, 3D hull, table, drawing, constraints, metrics |
| Изменить режим геометрии | Geometry mode | Profile inputs | Geometry, drawing, constraints, balance context | 2D, 3D hull, table, drawing, warnings |
| Изменить ЦВК | cylindricalInsertLength | Profile inputs | Geometry, drawing, constraints, balance context | 2D, 3D hull, table, drawing |
| Добавить оборудование | Shape/defaults | Equipment list | Constraints, balance | Equipment list, 2D/3D equipment, metrics |
| Выбрать оборудование | Equipment ID | Interaction/view state | Нет domain расчётов | Inspector, 2D/3D highlight |
| Изменить оборудование | Patch fields | Equipment list | Constraints, balance | Inspector, list, 2D/3D equipment, metrics |
| Переместить оборудование | Body position delta/absolute | Equipment item position | Constraints, balance | 2D/3D, inspector, metrics |
| Удалить оборудование | Equipment ID | Equipment list | Constraints, balance | List, 2D/3D, metrics |
| Изменить параметры воды | Density/gravity/future fields | Balance settings | Balance only | Metrics, warnings |
| Изменить настройки 3D | mode/opacity/section/camera | View state or project view state | No domain calculations | 3D only, maybe controls |
| Импортировать проект | JSON text/file | Project inputs atomically | Geometry, constraints, balance | All views + migration warnings |
| Экспортировать проект | Export target | No project mutation, maybe exportedAt in DTO | No domain calculations if evaluation fresh | Download/status |
| Сбросить проект | None/confirmation | Project inputs to defaults | Geometry, constraints, balance | All views |
| Отменить изменение | Command history step | Project inputs/view state depending policy | Affected derived slices | Affected views |
| Повторить изменение | Command history step | Project inputs/view state depending policy | Affected derived slices | Affected views |

## 9. Граф зависимостей и пересчётов

Обозначения: `Да` означает обязательный пересчёт/обновление после рефакторинга, `Нет` означает не требуется, `Локально` означает достаточно обновить локальное view/renderer state. Текущее приложение часто делает больше: почти любой input вызывает полный `update()`.

| Изменение | Геометрия | Теоретический чертёж | Ограничения | Баланс | 2D | 3D | Таблица | Persistence |
| --------- | --------: | -------------------: | ----------: | -----: | -: | -: | ------: | ----------: |
| Геометрия корпуса | Да | Да | Да | Да, если balance зависит от placement context | Да | Да | Да | Dirty |
| Количество станций | Да | Да | Возможно | Нет или возможно | Да | Возможно | Да | Dirty |
| Оборудование | Нет | Нет | Да | Да | Да | Да | Нет | Dirty |
| Только имя оборудования | Нет | Нет | Нет или локально | Нет | Локально, если labels есть | Локально, если labels есть | Нет | Dirty |
| Положение оборудования | Нет | Нет | Да | Да | Да | Да | Нет | Dirty |
| Плотность воды | Нет | Нет | Нет | Да | Нет | Нет, кроме balance markers | Нет | Dirty |
| Режим отображения 3D | Нет | Нет | Нет | Нет | Нет | Локально | Нет | Dirty only if saved |
| Положение камеры | Нет | Нет | Нет | Нет | Нет | Локально | Нет | Dirty only if saved |
| Сечение 3D | Нет | Нет | Нет | Нет | Нет | Локально | Нет | Dirty only if saved |
| Переключение сетки | Нет | Нет | Нет | Нет | Да | Возможно, если 3D grid есть | Нет | Dirty or view dirty |
| Выбор объекта | Нет | Нет | Нет | Нет | Highlight | Highlight | Нет | No, unless saved selection |
| Открытие/закрытие панели | Нет | Нет | Нет | Нет | Нет | Resize maybe | Нет | No, unless workspace state saved |

Что пересчитывается сейчас:

- Полный `update()` пересчитывает geometry, drawing, constraints, project state, balance и renderers для большинства событий.
- Resize отдельно перерисовывает Canvas/theoretical canvas и вызывает 3D resize без domain recalculation.
- Three.js mesh внутри себя оптимизирует повторное создание meshes по signatures.

Что должно пересчитываться после рефакторинга:

- Geometry changes должны invalidating geometry-dependent read models.
- Equipment changes не должны пересчитывать geometry.
- Balance settings changes не должны трогать hull mesh или table.
- Pure view changes не должны менять project domain state, если принято не сохранять их в проект.

Debounce нужен:

- Numeric typing в hull dimensions, stations, equipment dimensions/position.
- Drag/gizmo movement, если будет принято.
- Resize и camera interaction.

Batching нужен:

- Import project.
- Reset project.
- Multi-field equipment edits.
- Undo/Redo applying snapshots.

Достаточно локального обновления:

- Selection, hover, active panel.
- 3D opacity/view mode/camera, если не влияет на derived reports.
- Equipment name, если labels не участвуют в расчётах.

Длительные или асинхронные расчёты:

- Сейчас расчёты синхронные и небольшие.
- Future hydrodynamics, energy, comparison, denser mesh или CAD-like constraints могут потребовать Web Workers и статусы `calculating`, `stale`, `error`, `ready`.
- Пока это не принято, но UI может предусмотреть neutral diagnostics/status area.

## 10. Контракт UI с расчётными результатами

UI должен получать не только raw domain objects, а специализированные read models или structured reports. Причина: UI должен показывать нормализованные значения, validation errors, warnings, units, disabled states и limitations без дублирования инженерных правил.

Рекомендуемый набор данных для UI:

- Normalized project inputs: численные значения после clamp/round и связь `height`/`slenderness`.
- Validation report: errors/warnings с codes, severity, field path, localized message отдельно от core.
- Geometry result: `ProfileSnapshot` или будущий аналог, extents, stations, section shapes, limitations.
- Theoretical drawing read model: данные чертежа без Canvas specifics.
- Equipment report: per-item status, issues, summary, highlight severity.
- Balance report: CG, CB, net buoyancy, moment arms, warning codes, model label `equipment-only`.
- Presentation metadata: labels, units, formatted values, precision rules.
- Action availability: canSave, canExport, canUndo, canRedo, canAddEquipment, with blocking reasons.
- Calculation status: `ready` сейчас достаточно, но interface должен расширяться до `calculating/stale/error`, если появятся async tasks.
- Provenance/limitations: например “ЦВ рассчитан только по вытесненному объёму оборудования”.

Что UI не должен получать как единственный контракт:

- Внутренние mutable domain objects.
- DOM-derived state как source of truth.
- Persistence DTO как рабочую модель приложения.
- Renderer internal objects Three.js/Canvas как domain state.

Рекомендуемый вариант: application layer отдаёт immutable read models и structured reports, а UI отправляет commands. Это позволит проектировать интерфейс независимо от будущей реализации store/reducer и снизит риск дублирования расчётной логики в UI.

## 11. Архитектура 2D- и 3D-представлений

Подтверждённые факты и планы:

- Canvas 2D уже существует в `src/modules/rendering/canvas2d.ts` и остаётся частью текущего продукта.
- Three.js уже существует в `src/modules/rendering/scene3d.ts`, `mesh.ts`, `equipment3d.ts` и используется для 3D hull/equipment view.
- Теоретический чертёж имеет pure data в geometry и отдельные Canvas/SVG adapters.
- Hull mesh должен использовать `halfBreadthY`/`halfHeightZ` из snapshot и строить эллиптические rings, а не тело вращения по compatibility `radius`, основание: `AGENTS.md` и текущий `src/modules/rendering/mesh.ts`.

Желательный renderer contract после рефакторинга:

- Renderer получает immutable scene/view model: geometry, equipment visuals, statuses, view settings.
- Renderer не пересчитывает domain geometry.
- Renderer может emit interaction events: select, hover, drag start/move/end, camera changed.
- Renderer не владеет project state; максимум хранит internal resources и transient camera/control state.

Общий scene model или view model:

- Не принято.
- Рекомендуется подготовить common visual model для 2D/3D: equipment visual status, selected/hover/hidden/warning flags, body coordinate markers.

Независимость 2D и 3D:

- Сейчас оба получают общий snapshot/report из `main.ts`.
- После рефакторинга они должны иметь возможность обновляться независимо при view-only changes.
- Lazy enable/disable views возможен архитектурно, но не реализован.

Lazy loading Three.js:

- Не принято.
- Может быть полезно для public/demo/mobile performance, но переход не должен определять UI раньше анализа bundle/performance.

Selection synchronization:

- Желательная возможность: выбор оборудования в списке, 2D и 3D должен синхронизироваться.
- Сейчас централизованный selected state и picking в сцене не реализованы.

Возможности вне текущего подтверждённого scope:

- Выбор объекта непосредственно в 3D сцене.
- Перемещение объектов мышью.
- Gizmo/manipulators.
- Изменение размеров оборудования из сцены.
- Separate hover/selected/warning/hidden states как полноценная модель.

Камера и отображение в JSON:

- Сейчас `scene3dSettings` входит в JSON проекта, но camera parameters хранятся внутри Three.js instance и не входят в project JSON.
- Нужно отдельное решение: сохранять view state в проекте, отдельном workspace storage или не сохранять.

## 12. Технологические ограничения пользовательского интерфейса

Текущее состояние:

- Vanilla TypeScript + HTML/CSS через Vite entrypoint.
- Three.js для 3D.
- Frontend-only архитектура без backend.
- Тесты на Vitest.
- Docker workflow для dev/build/smoke.

UI-framework:

- Переход на React, Vue, Svelte или другой framework не принят.
- Объективная необходимость перехода пока не доказана документами или кодом.
- Сложность CSS, рост количества панелей или желание компонентности сами по себе не являются достаточным основанием.
- Если появятся Undo/Redo, сложные drafts, scene picking, multiple documents и extensive component state, тогда framework можно анализировать как вариант, но не как автоматическое решение.

Frontend-only и offline:

- Frontend-only сохраняется в текущем направлении.
- Offline file-based workflow сохраняется фактически: import/export JSON, CSV, SVG без backend.
- Cloud storage, auth и collaboration не входят в текущий scope.

Web Workers:

- Не планируются для текущих синхронных расчётов.
- Возможны позже для тяжёлых hydrodynamics/energy/comparison или CAD-like checks.

Браузеры и WebGL:

- Документы не фиксируют строгую browser support matrix.
- Three.js требует WebGL; UI должен иметь fallback/diagnostic для недоступного WebGL, особенно для public demo.

Mobile/desktop:

- Будущий UI может обсуждать desktop-first CAD-lite workbench и mobile read/demo workflow.
- Требование полноценного мобильного редактирования не принято.
- Touch gestures и keyboard accessibility не формализованы, но их стоит обсуждать как UX requirements до реализации.

## 13. Хранение, сохранение и версия проекта

Что сейчас входит в JSON проекта:

- `schemaVersion: 2`.
- `coordinateSystem: "SNAME_NED_BODY_CENTER_V1"`.
- `exportedAt`.
- `project.profile`.
- `project.equipment`.
- `project.scene3dSettings`.
- `project.balanceSettings`.

Поддерживаемые версии:

- JSON v2 является текущей схемой.
- JSON v1 поддерживается через migration в `src/modules/persistence/project-json-migrations.ts`.
- v2 import требует правильный coordinate marker.

Как работает миграция:

- v1 coordinates преобразуются в Body/SNAME-NED.
- `body.x = L/2 - old.x`.
- Старые оси оборудования и dimensions преобразуются к `lengthX/breadthY/heightZ` и Body axes.
- Import v1 добавляет пользовательское warning о предположениях по старой оси `z`.

Что планируется изменить:

- Документы рекомендуют отделить persistence DTO от canonical project state и применять import атомарно через normalization pipeline.
- Будущий `ProjectDocumentV3` возможен, но не принят.

Не принятые решения:

- Имя проекта.
- Описание проекта.
- `createdAt` и `modifiedAt`.
- Project ID.
- Autosave в localStorage или IndexedDB.
- Recent projects.
- Protection от потери unsaved changes.
- Сохранение camera/open panels/selection вместе с проектом.

Что нельзя смешивать с предметным состоянием:

- Renderer internal resources.
- DOM focus и active input.
- Hover/drag transient state.
- Browser file handles/download state.
- Calculation cache, если он восстанавливается из inputs.

Обратная совместимость:

- JSON v1 должен продолжать мигрироваться, пока есть сохранённые внешние файлы пользователей или regression fixtures.
- JSON v2 coordinate contract нельзя ломать без новой версии и migration.
- UI не должен предлагать ручное редактирование JSON как способ изменить инженерную модель.

## 14. Порядок и стратегия рефакторинга

Документы указывают на strangler/vertical seams, а не на одномоментное массовое перемещение файлов. Рекомендуемый порядок должен минимизировать риск изменения расчётов и UI.

Предполагаемая последовательность:

1. Стабилизация data-integrity tests: import/export, gravity preservation, equipment ID uniqueness после import/add, JSON round-trip.
2. Введение canonical `ProjectInputs` и общего normalization pipeline.
3. Введение application API: commands/use cases/store/reducer, точная форма не принята.
4. Выделение pure `deriveProject()` или эквивалентной функции evaluation.
5. Разделение project state, calculation results, view state, interaction state и persistence DTO.
6. Разделение rendering pipeline: renderers получают read models, а не читают application internals.
7. Введение presentation/read models для UI.
8. Адаптация текущего UI к application layer без смены визуального дизайна как обязательного шага.
9. Последующее обсуждение и реализация нового workbench/UI, если будет принято.

Когда безопасно начинать UI-работы:

- Обсуждать UI и создавать high-level wireframes можно уже сейчас.
- Утверждать терминологию, состав панелей, информационную архитектуру верхнего уровня можно уже сейчас с пометкой об открытых state decisions.
- Менять разметку безопаснее после появления application API или хотя бы стабильных view models.
- Внедрять новый workbench безопаснее после отделения DOM от state.
- Добавлять Undo/Redo безопасно только после решения о command history.
- Добавлять взаимодействие со сценой безопасно после централизованного selection/interaction state и renderer event contract.

## 15. Что точно не входит в рефакторинг

Non-goals текущего архитектурного рефакторинга:

- Изменение расчётных формул.
- Инженерная валидация исторических коэффициентов DSNP_PA.
- Полноценный CAD kernel.
- Backend.
- Авторизация.
- Облачное хранение.
- Совместная работа.
- База данных.
- Новый формат экспорта как обязательный результат.
- Физическое моделирование.
- Ходкость.
- Энергетика.
- Стоимость.
- Изменение визуального дизайна как часть архитектурного рефакторинга.
- Новый UI-framework как обязательное решение.

Пункты, которые могут появиться позже, но не являются scope этого рефакторинга:

- Full hydrostatics/watertight envelope.
- Mass groups и tensor inertia.
- Hydrodynamics и energy modules.
- Comparison workflow.
- CAD-like scene editing.

## 16. Архитектурные инварианты

Будущий UI не должен нарушать следующие ограничения:

- Body/SNAME-NED coordinate contract: origin в центре, `+X` к носу, `+Y` на правый борт, `+Z` вниз.
- Profile coordinate: `s=0` на носу, `s=L` на корме, `body.x = L/2 - s`.
- Three.js и Canvas/SVG используют coordinate adapters, а не собственные скрытые соглашения.
- `ProfileSnapshot` или будущий аналог является общим источником для 2D, 3D, таблицы и exports.
- JSON v1/v2 migrations должны оставаться явными и тестируемыми.
- Equipment-only balance нельзя называть полным ЦВ внешнего корпуса.
- UI не должен дублировать геометрические формулы.
- Расчёты не должны зависеть от DOM, Canvas или Three.js.
- Persistence DTO не должен становиться вторым владельцем domain state.
- UI не является источником инженерной истины; он только отправляет intent и отображает нормализованные results.

## 17. Влияние рефакторинга на проектирование UI

### 17.1. UI-решения, которые можно принимать уже сейчас

- Разделение публичной landing/demo страницы и инженерной рабочей среды: подтверждается текущим public demo контекстом и frontend-only stack.
- Общая структура CAD-lite workbench: центральная 2D/3D область, боковые панели inputs/inspector/results, верхняя панель file/export actions.
- Терминология: `ЦВК` только цилиндрическая вставка, `ЦВ` только центр величины.
- Визуальное разделение “форма корпуса”, “оборудование”, “ограничения”, “баланс”, “экспорт”.
- Список и inspector оборудования для текущего flat list.
- Постоянно заметные diagnostics/warnings, особенно для equipment-only balance и legacy limitations.
- Desktop-first сценарий и отдельный mobile/demo сценарий как обсуждаемая UX-гипотеза.
- Design system на уровне tokens/components без выбора framework.

### 17.2. UI-решения, которые зависят от рефакторинга

- Undo/Redo: требует command history и state transition model.
- Двустороннее взаимодействие со сценой: требует renderer event contract и centralized selection/interaction state.
- Дерево оборудования: требует решения о groups/systems/aggregates.
- Локальные пересчёты и stale indicators: требуют dependency graph и evaluation cache/status model.
- Autosave: требует dirty tracking, persistence state и storage decision.
- Несколько проектов: требует multi-document state model.
- Background calculations: требуют async evaluation/Web Worker decision и statuses.
- Сохранение camera/open panels: требует решения о project view state vs workspace state.

### 17.3. UI-решения, которые не следует принимать до дополнительных решений

| UI-решение | Требуемое архитектурное решение | Кто должен принять | Риск преждевременного выбора |
| ---------- | ------------------------------ | ------------------ | ---------------------------- |
| Framework migration | Нужен ли framework и какие проблемы он решает | Технический владелец проекта вместе с UI/frontend ответственным | Переписать UI без устранения state проблемы |
| Equipment tree/systems UI | Предметная модель groups/systems/components | Product/engineering domain owner | Спроектировать навигацию под несуществующую модель |
| Full hydrostatics panel | Watertight envelope и `BuoyancyModel` | Engineering/domain owner | UI будет обещать расчёт, которого нет |
| Scene gizmos | Interaction state, coordinate snapping, command history | Architecture + UX + geometry owner | Сложные interactions без Undo и validation |
| Autosave/recent projects | Storage backend: localStorage/IndexedDB/file handles | Architecture/product owner | Потеря данных или конфликт с file-based workflow |
| Multi-project tabs | Multi-document application state | Architecture/product owner | Layout закрепит неподдерживаемую модель |

## 18. Матрица архитектурных решений и влияния на UI

| Архитектурное решение | Статус | Варианты | Влияние на UI | Риск преждевременного решения | Требуется решение до UI |
| --------------------- | ------ | -------- | ------------- | ----------------------------- | ----------------------- |
| Modular Monolith + Functional Core + Application Layer + Browser Adapters | принято | Не выбирать microservices/Clean overengineering | UI работает через adapters/API | Низкий | Нет, уже принято |
| Body/SNAME-NED coordinates | принято | Нет для текущей версии | Все labels/projections должны быть согласованы | Ошибки осей в 2D/3D/forms | Да, уже принято |
| DOM не source of truth | принято | Application store/controller | UI не должен напрямую владеть domain state | Высокий при redesign до refactor | Да для реализации нового UI |
| Canonical `ProjectInputs` | предварительно принято | Type + store/reducer/controller | Определит формы, save/dirty, import | Средний | Да для сложного UI |
| `deriveProject()` / `ProjectEvaluation` | предварительно принято | Function или evaluation service | Определит read models/results | Средний | Да для локальных пересчётов |
| Commands/use cases | рекомендовано | Dispatch/reducer, command API, controller methods | Определит event handling и Undo | Высокий | Да для Undo/Redo и scene editing |
| `SectionShape` | рекомендовано | Discriminated union, evaluator interface | Влияет на geometry UI и renderers | Средний | До новых geometry modes |
| Equipment groups/systems | не решено | Flat list, groups, tree, systems | Влияет на navigation/inspector | Высокий | Да для tree UI |
| Full watertight hydrostatics | не решено | Equipment-only, watertight, composite | Влияет на balance panels | Высокий | Да для full CB UI |
| Save view state in JSON | не решено | In project, workspace storage, not saved | Влияет на camera/panels persistence | Средний | До autosave/recent UX |
| Undo/Redo history | не решено | Command history, snapshots, none | Влияет на toolbar and interactions | Высокий | Да для editing UX |
| UI-framework migration | не решено | Vanilla TS, React, Vue, Svelte, other | Влияет на implementation, not IA alone | Высокий | Нет для wireframes, да для implementation |
| Backend/cloud/collaboration | вне scope | None | Не проектировать account/cloud UX | Высокий | Нет |

## 19. Открытые вопросы

Предметные:

- Будут ли equipment groups/systems/tree. Важно для navigation и inspector. Варианты: flat list сохранить, добавить группы, добавить системы, добавить дерево агрегатов. UI можно обсуждать без ответа только на уровне extensible layout.
- Как моделировать structural mass и ballast. Важно для mass properties и balance UI. Варианты: equipment subtype, отдельная mass model, system-level masses. Детальный UI преждевременен.
- Какой full hydrostatics/watertight envelope нужен. Важно для ЦВ и предупреждений. Варианты: отдельный watertight envelope, composite buoyancy model, delayed scope. UI full CB преждевременен.

Архитектурные:

- Store/reducer или application controller. Важно для commands, Undo/Redo, tests. UI wireframes можно продолжать; implementation должен ждать.
- Где хранить view state. Важно для persistence UX. Варианты: project JSON, workspace storage, transient only. Можно обсуждать UX preference, но не фиксировать behaviour.
- Как разделить validation messages и calculation codes. Важно для localization и diagnostics. UI может проектировать severity patterns.

UI/UX:

- Desktop-first или responsive-first. Важно для layout. Варианты: полноценный responsive editor, desktop editor + mobile viewer/demo. Можно обсуждать сейчас.
- Нужно ли keyboard-first editing. Важно для forms, shortcuts, accessibility. Можно обсуждать сейчас.
- Нужны ли touch gestures. Важно для 2D/3D scene controls. Можно обсуждать как requirement.

Производительность:

- Нужны ли debounce/batching policies. Важно для typing и drag. Варианты: debounce form inputs, batch commands, local render updates. UI implementation зависит от refactor.
- Нужны ли Web Workers. Важно для async statuses. Сейчас не нужно, future open.

Persistence:

- Autosave/local storage/IndexedDB. Важно для save UX. Не принято.
- Recent projects. Важно для landing/workbench. Не принято.
- Защита от потери unsaved changes. Важно для navigation. Не реализовано, но UX можно обсуждать.

2D/3D:

- Будет ли picking в 2D/3D. Важно для selection model. Не принято.
- Будут ли gizmos/manipulators. Важно для scene UI и Undo. Не принято.
- Нужны ли hidden/locked/warning visual states. Желательно, но модель не утверждена.

Тестирование:

- Нужна ли browser E2E suite. Сейчас Vitest покрывает modules, но committed Playwright suite нет. Важно для redesigned UI. Решение не принято.
- Какие regression tests добавлять перед state refactor. Рекомендованы data-integrity tests.

Scope:

- Должен ли refactor включать visual redesign. Документы говорят, что нет: это отдельный последующий этап.
- Должен ли refactor включать новый framework. Нет принятого решения.

## 20. Рекомендации для последующего обсуждения UI

Рекомендуемые пользовательские роли:

- Инженер/проектировщик, который задаёт корпус, размещает оборудование и смотрит ограничения.
- Рецензент/заказчик demo, который смотрит 2D/3D, таблицы и exports без глубокого редактирования.
- Разработчик/исследователь, который проверяет legacy DSNP_PA traceability и regression outputs.

Основные пользовательские сценарии:

- Создать или открыть проект.
- Задать размерения корпуса и режим геометрии.
- Настроить ЦВК и stations.
- Добавить и отредактировать оборудование.
- Проверить выход за корпус, пересечения и balance warnings.
- Сравнить 2D, 3D, таблицу и theoretical drawing.
- Экспортировать JSON/CSV/SVG.

Предполагаемая структура рабочего пространства:

- Верхняя панель: new/open/save/export/reset, undo/redo placeholders if accepted later.
- Левая или правая панель inputs: корпус, geometry mode, stations, environment.
- Центральная область: tabs/split для 2D profile, 3D scene, theoretical drawing.
- Equipment panel: flat list сейчас, future-ready место для groups/tree.
- Inspector: выбранное оборудование или выбранный project/hull section.
- Diagnostics/results: constraints summary, balance status, limitations.

Данные, которые должны быть видны одновременно:

- Основные размерения корпуса и geometry mode.
- 2D/3D визуализация текущего корпуса.
- Equipment status summary.
- Balance headline: mass, buoyancy, CG/CB with equipment-only label.
- Critical warnings/errors.

Данные, которые можно вынести во вкладки:

- Подробная таблица stations.
- Теоретический чертёж.
- Полные JSON/export settings.
- Подробные diagnostics/reports.

Действия верхней панели:

- New/open/import/save/export/reset.
- Future undo/redo только после command history decision.
- View layout toggles, если будут относиться к workspace state.

Действия выбранного объекта:

- Rename, duplicate if accepted, delete.
- Edit position/dimensions/mass/displaced volume parameters.
- Focus/show in 2D/3D.
- Future lock/hide/group actions только после предметного решения.

Результаты и предупреждения, которые должны быть постоянно заметны:

- Ошибки валидности equipment.
- Выход equipment за корпус.
- Пересечения.
- Net buoyancy и major balance warnings.
- Явный label: текущий ЦВ/CB относится к equipment-only displaced volume.
- Import migration warnings для JSON v1.

Каждая рекомендация опирается на архитектурный вывод: state должен перейти в application layer, calculations должны выдавать structured reports, а UI должен отображать limitations и statuses без владения расчётами.

## Контекст для обсуждения пользовательского интерфейса

Underwater Vehicle Designer — браузерный инженерный инструмент для построения 2D/3D-обводов корпуса подводного аппарата и базовой компоновки оборудования. Сейчас это Vite + TypeScript SPA без backend. Пользователь задаёт размерения корпуса, выбирает режим геометрии `current-formula` или legacy DSNP_PA, смотрит Canvas 2D, Three.js 3D, теоретический чертёж, таблицу станций, список оборудования, constraints и equipment-only balance. Экспортируются JSON, CSV, SVG и SVG теоретического чертежа.

Текущее приложение работает, но архитектурно всё завязано на `src/app/main.ts`. Этот файл читает DOM, держит runtime state, запускает расчёты и рендерит views. Состояние не единое: profile inputs находятся в DOM, equipment list хранится в переменной `main.ts`, 3D settings читаются из DOM, balance settings частично берутся из DOM и constants. `ProjectState` сейчас является aggregate для export, а не настоящим store.

Цель рефакторинга — не redesign UI, а отделение инженерной модели от DOM и renderers. Принятое направление: Modular Monolith + Functional Core + Explicit Application Layer + Browser Adapters. Предполагается ввести canonical `ProjectInputs`, общий normalization pipeline, application commands/use cases или store, и pure `deriveProject()`/`ProjectEvaluation`, который будет выдавать geometry snapshot, theoretical drawing, constraints, balance и reports. DOM, Canvas, Three.js, JSON и download должны быть adapters.

Будущие слои можно понимать так: shared/kernel для координат и math; domain/core для geometry/equipment/balance; project state для canonical inputs; application/use cases для commands and normalization; presentation/read models для UI; rendering для Canvas/Three; persistence для JSON/CSV/SVG; UI для layout and interactions. UI должен отправлять команды и получать read models, а не дублировать формулы.

Предметная модель сейчас включает корпус (`ProfileState`), режим геометрии, станции, flat list оборудования, формы `sphere/cylinder/box`, constraints, mass, displaced volume, equipment-only CG/CB и параметры воды. Не решены groups/systems/tree оборудования, structural mass, ballast, watertight envelope, full hull CB, variants and project metadata. Поэтому UI может предусмотреть место под будущие группы, но не должен проектировать их как уже принятую модель.

Граф пересчётов сейчас грубый: почти любое изменение вызывает полный update. После рефакторинга изменение корпуса должно пересчитывать geometry/drawing/constraints/balance; изменение equipment — constraints/balance/views без пересчёта geometry; изменение density — только balance; изменение camera/3D opacity/selection — только локальные views. Для typing и drag нужны debounce/batching. Future async calculations могут потребовать statuses `calculating`, `stale`, `error`, `ready`, но сейчас расчёты синхронные.

2D и 3D остаются важными частями продукта. Canvas 2D и Three.js уже есть. Они должны работать от общего geometry/read model и синхронизировать selection через application state, если selection будет реализован. Picking в сцене, drag, gizmos и изменение размеров из 3D не приняты и зависят от command history, interaction state и renderer event contract.

Persistence сейчас: JSON v2 с marker `SNAME_NED_BODY_CENTER_V1`, import/export project profile/equipment/scene3d/balance settings, migration v1 -> v2. Не решены name/description, createdAt/modifiedAt, project ID, autosave, recent projects, dirty protection и сохранение camera/open panels. JSON v1/v2 backward compatibility нельзя ломать без новой версии и migration.

Жёсткие ограничения для UI: Body/SNAME-NED оси неизменны; `ЦВК` означает цилиндрическую вставку, `ЦВ` — центр величины; текущий balance — equipment-only, не полный ЦВ внешнего корпуса; 2D, 3D, таблица и exports должны использовать общий `ProfileSnapshot` или будущий аналог; UI не должен быть источником инженерной истины.

Можно обсуждать уже сейчас: landing vs workbench, CAD-lite layout, терминологию, панели корпуса/оборудования/результатов, визуальную иерархию, diagnostics area, desktop/mobile сценарии, design system без выбора framework. Преждевременно фиксировать: Undo/Redo, autosave, multi-project tabs, equipment tree, full hydrostatics panel, scene gizmos, сохранение camera/workspace state, переход на React/Vue/Svelte. Эти решения зависят от application state, command API, domain model и persistence strategy.
