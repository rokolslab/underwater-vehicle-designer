# Архитектурный контекст будущего UI

## 4.1 Паспорт анализа

Дата актуализации: 2026-08-05.

Baseline анализа: `master`, `8557a48b8bc72aec53eb7f040c5e134189d74e77`.

Статус рабочей копии перед анализом: clean, `HEAD` синхронизирован с `origin/master`.

Назначение документа: дать контекст для принятия решений по следующему обсуждению UI без проектирования финального визуального дизайна и без изменения кода приложения.

Границы работы: этот документ описывает фактическое состояние текущего `HEAD`, архитектурные ограничения и решения, которые стоит принять перед следующим UI seam. Он не заменяет `docs/architecture.md`, а уточняет важную для UI часть архитектуры.

Изменения в рамках актуализации: изменен только `docs/architecture/ui-refactoring-context.md`. HTML, CSS, TypeScript приложения, зависимости, JSON-схема, расчётные формулы, snapshots, branch, commit и PR не менялись.

Основные источники: `AGENTS.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/RESEARCH.md`, `.ai-factory/ROADMAP.md`, архивные AI Factory планы по import/export, `deriveProject()`, command/reducer/store и `SectionShape`, `docs/architecture.md`, `docs/ui-ux.md`, `docs/calculations.md`, `docs/data-and-export.md`, `index.html`, `src/app/*`, `src/application/project/*`, `src/modules/*`, `playwright.config.ts`, `tests/e2e/import-export.spec.ts`.

Дополнительная проверка UI: приложение было открыто в браузере на `http://127.0.0.1:5173/#controls`; snapshot подтверждает текущую публичную структуру hero, рабочей области, секций координат, размерений, оборудования, экспериментального баланса, теоретического чертежа и таблицы станций.

## 4.2 Резюме для принятия решений

Ключевой вывод: блокирующий архитектурный долг предыдущего анализа уже существенно погашен. В проекте есть canonical `ProjectInputs`, typed `ProjectCommand`, pure `reduceProject()`, `ProjectStore`, pure `deriveProject()` и согласованная publication `{ inputsSnapshot, evaluation }` через `projectEvaluationRuntime`.

UI больше не нужно планировать вокруг проблемы «DOM является единственным источником инженерной истины». Текущая правильная рамка: DOM остается browser adapter, но `main.ts` все еще слишком широк как composition root, контроллер событий, контроллер import/export и координатор рендеринга.

Следующий UI шаг должен быть не «переписать все на framework», а выделить узкий UI seam вокруг projection состояния и адаптеров. Наиболее полезный seam: сделать интерфейсные panels/view-models явными, чтобы будущий React/Svelte/vanilla split мог потреблять `ProjectInputs`, `ProjectEvaluationPublication` и `ProjectViewState`, не зная формул корпуса и не пересчитывая geometry.

Решение о framework пока можно отложить. Текущий vanilla UI уже работает, а application layer достаточно отделен, чтобы сначала уточнить информационную архитектуру, UX-модель workbench, contracts для панелей и правила сохранения view state.

Главные решения, которые нужны до крупной UI-перестройки: модель навигации продукта, приоритет desktop/mobile, владение transient view state, dirty/autosave policy, object selection model, представление diagnostics, JSON contract для camera/view state и уровень амбиций интерактивности 2D/3D.

## 4.3 Дельта относительно предыдущего анализа

Предыдущая версия этого документа была исторической. Она утверждала, что в проекте нет canonical application state, `ProjectStore`, command/reducer layer и `deriveProject()`. Для текущего `HEAD` это утверждение неверно.

Уже реализовано:

- `ProjectInputs` в `src/application/project/model.ts` хранит `profile`, `equipment`, `balanceSettings`.
- `ProjectCommand` в `src/application/project/commands.ts` описывает canonical mutations.
- `reduceProject()` в `src/application/project/reducer.ts` выполняет immutable transitions.
- `ProjectStore` в `src/application/project/store.ts` владеет canonical snapshot и dispatch contract.
- `deriveProject(ProjectInputs)` в `src/application/project/derive.ts` строит `ProjectEvaluation`.
- `projectEvaluationRuntime` публикует последнюю успешную согласованную пару `{ inputsSnapshot, evaluation }`.
- `ProjectViewState` в `src/app/projectProjection.ts` отделяет grid/points/3D settings от engineering inputs.
- JSON import/export идет через projection между serializable project и `ProjectInputs + ProjectViewState`.
- `SectionShape` seam введен, consumers используют shape operations или shape-derived data.
- Playwright E2E infrastructure и import/export round-trip tests присутствуют.

Все старые рекомендации про «ввести canonical state», «создать `deriveProject()`» и «перестать собирать временный `ProjectState` в `main.ts`» теперь следует считать выполненными для текущего объема canonical mutations.

Актуальный долг переместился выше: `main.ts` все еще связывает DOM controls, command dispatch, runtime commit, view-only rerender, import/export, download actions, notifications и жизненный цикл renderers. Это не расчетный долг, а долг browser controller и UI adapters.

## 4.4 Фактическая текущая архитектура

Текущий runtime flow:

```text
DOM controls/events
  -> appState.readState()/import adapters
  -> ProjectCommand
  -> ProjectStore.dispatch()/reduceProject()
  -> ProjectInputs
  -> projectEvaluationRuntime.commit()
  -> deriveProject()
  -> ProjectEvaluation
  -> renderPublication()
  -> DOM/Canvas/Three.js/export adapters
```

View-only flow:

```text
DOM view event
  -> ProjectViewState update
  -> projectEvaluationRuntime.rerender()
  -> renderPublication() with existing ProjectEvaluation
```

`index.html` остается Vite shell. `src/app/main.ts` является composition root и browser controller. Он не содержит формул geometry, но отвечает за binding, reading controls, dispatching commands, explicit runtime commits, rerender, import/export, downloads, resize and scene lifecycle.

`src/application/project/` является текущим application layer. Он знает о project contracts, commands, reducer, store, defaults, normalization and derive. Dependency checks фиксируют, что application reducer/store не должны импортировать DOM, rendering, persistence или logger.

`src/modules/geometry/`, `src/modules/equipment/`, `src/modules/balance/` остаются functional core-like расчетными модулями. Rendering, persistence и UI читают готовые snapshots/reports, а не должны владеть инженерной моделью.

## 4.5 Модель состояния

Текущее состояние разделено на три уровня:

| State | Owner | Содержимое | Persisted |
| --- | --- | --- | --- |
| `ProjectInputs` | `ProjectStore` | `profile`, `equipment`, `balanceSettings` | Да, через JSON projection |
| `ProjectViewState` | `src/app/projectProjection.ts` и `main.ts` | `showGrid`, `showPoints`, `scene3dSettings` | Да, в текущем JSON v2 |
| `ProjectEvaluationPublication` | `projectEvaluationRuntime` | `inputsSnapshot`, `ProjectEvaluation` | Нет |

`ProjectInputs.profile` содержит `geometryMode`, `length`, `breadth`, `height`, `cylindricalInsertLength`, `stations`.

`ProjectInputs.equipment` содержит immutable список `EquipmentItem`.

`ProjectInputs.balanceSettings` содержит `waterDensityKgPerM3` и `gravityMPerS2`.

`ProjectEvaluation` содержит `hullGeometry`, `theoreticalDrawing`, `constraints`, `balance`.

Текущие non-canonical или transient данные: camera interaction внутри Three.js scene, focus preservation, notification state, file input state, unsaved/dirty state, autosave state, selection state and recent-projects state. Эти вещи не являются частью `ProjectInputs` и сейчас не имеют отдельного versioned contract.

Важное UI-следствие: будущий UI должен читать canonical engineering inputs из `ProjectStore`, derived engineering outputs из current publication, а presentation/transient state из отдельного view/session layer. Нельзя добавлять новые инженерные поля только в DOM controls.

## 4.6 Модель команд

Текущий `ProjectCommand` union:

| Command | Назначение |
| --- | --- |
| `ReplaceProfile` | Заменить normalized profile inputs |
| `AddEquipment` | Добавить equipment item с optional requested id, shape, name |
| `UpdateEquipment` | Изменить equipment item по `id` |
| `DeleteEquipment` | Удалить equipment item по `id` |
| `ReplaceBalanceSettings` | Заменить настройки расчета баланса |
| `ReplaceProject` | Атомарно заменить весь canonical project |

Команды описывают engineering mutations, а не DOM actions. Это правильная граница для будущего UI framework: кнопки, формы, panels и keyboard shortcuts должны превращаться в commands, а не напрямую менять расчетные структуры.

Чего command model пока не делает: Undo/Redo, batch transaction labels, dirty tracking, selection commands, camera/view commands, import preview, validation-only command simulation and optimistic updates. Их не нужно добавлять без конкретного UI сценария.

Практический вывод: следующий UI seam может добавить adapter-level actions поверх текущих `ProjectCommand`, но не должен смешивать view-only actions с engineering commands без отдельного discriminator.

## 4.7 Граф пересчета и рендеринга

Canonical mutation выполняет полный derive:

```text
ProjectInputs
  -> makeProfileSnapshot/profile geometry
  -> makeTheoreticalDrawing
  -> evaluateEquipmentConstraints
  -> calculateEquipmentBalance
  -> ProjectEvaluation
```

`renderPublication()` затем обновляет Canvas 2D, theoretical drawing Canvas, table, metrics, workbench summary, equipment editor, Three.js and export-ready runtime references.

View-only mutation не должна вызывать `deriveProject()`. Текущая архитектура уже поддерживает `projectEvaluationRuntime.rerender()` для повторного rendering с последней publication.

Если `deriveProject()` падает после canonical dispatch, `ProjectStore` уже содержит новые inputs, но engineering rendering/export сохраняют последнюю успешную согласованную publication. JSON export отражает свежий store, так как JSON intentionally serializes inputs/view, not evaluation.

UI-риск: пользователь может увидеть старую визуальную engineering publication при свежем JSON state, если derive error не представлен достаточно явно. Для будущего UI нужен explicit error/diagnostics surface вокруг runtime phases.

## 4.8 `main.ts`

`src/app/main.ts` сейчас является рабочим composition root, но он остается самым крупным UI-архитектурным узлом. UX-1 workbench shell вынес компактную инженерную сводку в `src/modules/ui/workbenchSummary.ts`; это небольшой UI adapter/view-model seam, который потребляет `ProjectInputs` и `ProjectEvaluation`, но не пересчитывает geometry, constraints или balance.

Фактические обязанности `main.ts`:

- Находит DOM элементы и связывает events.
- Читает profile controls через `appState`.
- Преобразует DOM/import actions в `ProjectCommand`.
- Вызывает `ProjectStore.dispatch()` и runtime commit.
- Поддерживает `ProjectViewState`.
- Управляет `projectEvaluationRuntime.rerender()` для view-only изменений.
- Координирует Canvas 2D, theoretical drawing, table, metrics, equipment editor and Three.js.
- Координирует workbench summary через `renderWorkbenchSummary()` на той же coherent publication boundary.
- Выполняет import/export/download workflows.
- Обрабатывает notifications, resize and scene lifecycle.

Что хорошо: формулы geometry и balance уже не живут в `main.ts`; canonical mutations проходят через application layer.

Что мешает будущему UI: panels не имеют единого view-model contract, event wiring and render orchestration hard-coded together, import/export UX and engineering dispatch share one controller, and future selection/dirty/autosave would likely enlarge `main.ts` further.

Минимальная следующая граница: выделить browser controller adapters per panel or feature without moving core/application contracts. Цель - уменьшить `main.ts` до startup, dependency creation and explicit subscriptions.

## 4.9 Взаимодействие 2D/3D

Canvas 2D сейчас отображает XZ-профиль, сетку, станции and equipment overlay. Он использует `ProfileSnapshot`, equipment list and constraints report.

Three.js сейчас отображает корпус and equipment meshes. Current 3D modes are `Сплошной` and `Рентген`; persisted legacy `cutaway` normalizes to `x-ray`. Section controls independent of view mode.

Текущая 3D сцена имеет rendering lifecycle and camera interaction, но не имеет product-level object picking, selection, gizmo editing, measurement tools or synchronized 2D/3D selection.

UI-решение, которое нужно принять до интерактивного 2D/3D editing: является ли equipment selection частью `ProjectViewState`, transient session state или будущего command/view-store. Не следует сохранять selection в engineering `ProjectInputs`.

Для будущего UI правильный contract: 2D/3D получают publication и view state, а наружу отправляют typed view/application actions. Они не должны изменять equipment arrays мутабельно или самостоятельно пересчитывать containment.

## 4.10 `SectionShape`

`SectionShape` уже введен как seam для обобщения сечений. Production contract сейчас намеренно поддерживает только ellipse:

```ts
type SectionShape = { kind: "ellipse"; halfBreadthY: number; halfHeightZ: number };
```

Pure operations в `src/modules/geometry/section-shape.ts` покрывают area, containment, contour sampling, waterline/buttock intersections и связанные shape-derived operations.

`ProfileSnapshot` несет shape-bearing section extents рядом с compatibility fields: `radius`, `halfBreadthY`, `halfHeightZ`, `topRadius`, `bottomRadius`. Mesh, constraints and theoretical drawing должны использовать shape operations or shape-derived data, а не локальные ellipse equations и не ветвления по `geometryMode`.

Для UI это значит: controls будущих `Priam`/`Kr` или non-ellipse parameters должны добавляться как profile inputs and shape parameters through application normalization. Нельзя добавлять UI-only switches, из-за которых renderers расходятся с `ProfileSnapshot`.

## 4.11 Будущие физические модели

Текущий balance является `Баланс оборудования`, а не full hydrostatics. UI уже помечает его как `Experimental` и содержит disclaimer.

Нужно сохранять разделение физических моделей:

| Model | Смысл |
| --- | --- |
| `HydrodynamicFairing` | Внешняя форма для обводов и future hydrodynamics |
| `PlacementEnvelope` | Допустимая область размещения оборудования |
| `StructuralMassModel` | Масса оболочки, переборок и конструкций |
| `WatertightEnvelope` | Герметичный вытесняющий объем for hydrostatics |

Equipment-only displaced volume и watertight-envelope buoyancy не должны неявно складываться. Future `BuoyancyModel` должен иметь discriminator и защиту от double counting.

UI-последствие: будущие панели «Гидростатика», «Массы», «Остойчивость», «Энергетика» не должны переиспользовать current equipment-only balance terminology так, будто это full vehicle balance.

## 4.12 Сохранение и JSON

Текущая версия JSON schema: `2`.

Текущий coordinate marker: `SNAME_NED_BODY_CENTER_V1`.

JSON хранит serializable project state:

- `profile` с geometry inputs и view flags.
- `equipment`.
- `scene3dSettings`.
- `balanceSettings`.

JSON не хранит `ProjectEvaluation`. Derived geometry, constraints, drawing and balance пересчитываются после import.

Import поддерживает v2 и one-way v1 migration. Parsing нормализует profile, equipment, duplicated IDs, scene settings и balance settings, затем `serializableProjectToInputsAndView()` разделяет данные на `ProjectInputs` и `ProjectViewState`.

Открытые persistence decisions для UI: сохранять ли camera, selection, dirty/autosave metadata, panel collapse states, recent projects and comparison snapshots. Эти данные не стоит добавлять в текущий JSON v2 без решения о versioned DTO.

## 4.13 Текущий UI

Факты о текущем публичном UI:

- Hero использует реальный статический Three.js render в `public/images/hero-hull-render.png`.
- Декоративный `.hull-blueprint` удален.
- Geometry mode labels: `Базовая формула` и `Классическая методика`.
- Coordinate aside states Body/SNAME-NED: X to bow, Y starboard, Z down.
- 3D view modes: `Сплошной` и `Рентген`.
- Section controls независимы от view mode.
- Balance section: `Баланс оборудования`, collapsed by default, marked `Experimental`, with disclaimer.
- Numeric inputs используют native `type="number"` controls with `inputmode="decimal"` or `numeric`.
- Workbench sections включают dimensions, geometry/visual controls, equipment, balance, theoretical drawing and station table.

UI уже выглядит как публичное demo, а не только internal tooling. Следующая UI-работа должна сохранять это визуальное направление, если явная цель redesign не поставлена.

## 4.14 Готовность тестов

Релевантное текущее покрытие:

- Unit tests для coordinates, app state, DOM contract, geometry, equipment, balance, rendering data, persistence and UI modules.
- Application layer tests including dependency boundaries.
- Playwright E2E configuration in `playwright.config.ts`.
- E2E import/export round-trip in `tests/e2e/import-export.spec.ts`.
- Encoding check script для UTF-8 и ключевых русских UI-строк.

Для UI refactoring минимальная safety net должна включать `npm run check:encoding`, `npm run test`, `npm run build` и targeted Playwright checks при изменении DOM behavior.

Потенциальные test gaps перед крупной UI-переписью: visual regression не настроен, full mobile interaction coverage ограничен, 3D picking не существует, dirty/autosave не реализован, framework-level component tests отсутствуют, потому что UI сейчас vanilla DOM.

## 4.15 Оценка UI Framework

Framework migration возможна, но не требуется для разблокировки следующего архитектурного шага.

Причины отложить выбор framework:

- Application layer уже изолирует canonical state и derived evaluation.
- Текущее public demo работает и имеет DOM contract coverage.
- Главная текущая проблема - широта orchestration в `main.ts`, а не отсутствие virtual DOM.
- Выбор framework зависит от будущей интерактивности: forms-only workbench, CAD-like editor или multi-document application.

Причины, по которым framework может стать полезным:

- Более сложный equipment editor и validation UX.
- Persistent panel state, selection и synchronized 2D/3D interactions.
- Multi-screen responsive layout with reusable view models.
- Undo/Redo and command history presentation.
- Comparison workflows, snapshots and project browser.

Если выбирать позже, React совместим с текущим TypeScript/Vite stack и application contracts. Svelte также подходит для adapter-heavy UI. Оставаться на vanilla тоже допустимо, если следующие seams небольшие, а tests targeted.

## 4.16 Матрица UI-решений

| Решение | Вариант A | Вариант B | Рекомендация |
| --- | --- | --- | --- |
| Framework now | Migrate immediately | Keep vanilla while extracting seams | Keep vanilla for next seam |
| State ownership | Expand `ProjectInputs` | Separate engineering/view/session state | Separate states |
| `main.ts` refactor | Big-bang rewrite | Panel-by-panel adapters | Panel-by-panel |
| 2D/3D editing | Direct renderer mutation | Emit typed actions | Typed actions |
| Persistence | Store all UI state in v2 | Version DTO before new state | Version DTO first |
| Diagnostics | Russian strings from core | Codes/params from core, text in UI | Codes/params in future |
| Balance UX | Present as full hydrostatics | Keep equipment-only disclaimer | Keep disclaimer |
| Mobile | Full CAD parity | Read/inspect/export first | Inspect/export first |

## 4.17 Ближайшие решения

Решения, которые стоит принять перед следующей UI-реализацией:

- Определить, на что нацелена следующая UI-работа: public landing polish, ясность engineering workbench или глубина interaction.
- Определить desktop-first или mobile-supported scope для workbench.
- Решить, являются ли panel collapse state, selected equipment и camera session-only или persisted.
- Решить, входят ли dirty state и autosave в следующий milestone.
- Решить первый object-selection contract для equipment в списках, Canvas и Three.js.
- Решить, как показывать пользователю runtime derive/render errors.
- Решить, нужно ли начинать миграцию diagnostics от пользовательского текста в core reports к stable codes plus UI messages.

Решения, которые можно отложить:

- Финальная visual design system.
- Full framework migration.
- Undo/Redo implementation.
- Multi-project workspace.
- Full hydrostatics UI.
- CAD-like gizmo editing.
- Project JSON v3, если не требуется новое persisted state.

## 4.18 Следующий UI Seam

Рекомендуемый следующий seam: ввести явные UI view-model/adapters вокруг текущей publication и view state без изменения engineering contracts.

Минимальный полезный slice:

- Выделить boundary в стиле `renderWorkbench(publication, viewState, actions)` или per-panel equivalent.
- Оставить `ProjectCommand` dispatch в application-facing actions.
- Держать view-only actions отдельно от `ProjectCommand`.
- Выносить из `main.ts` orchestration по одной панели за раз.
- Сохранять текущую DOM structure и tests, если UI-задача явно не меняет layout.

Хорошие первые кандидаты:

- 3D controls panel, потому что он в основном меняет `ProjectViewState` и rerender от текущей publication.
- Balance metrics panel, потому что он должен потреблять `ProjectEvaluation.balance` и показывать equipment-only disclaimers.
- Equipment editor, потому что это наиболее ценная будущая interaction surface, но он требует большей осторожности из-за focus и dynamic inputs.

Не брать первым seam:

- Full import/export rewrite.
- Full `main.ts` split.
- Framework migration и UI redesign в одном patch.
- Undo/Redo до описания command history requirements.

## 4.19 Открытые вопросы

- Будущий UI должен быть прежде всего public demo, engineering workbench или CAD-like editor?
- Какие interactions обязаны хорошо работать на mobile: inspect, edit dimensions, edit equipment, export или все сразу?
- Camera state нужно сохранять в project JSON, browser storage или не сохранять вообще?
- Equipment selection является session concept или частью shareable project state?
- View settings должны оставаться в JSON v2 или перейти в будущий `ProjectDocumentV3` view/session block?
- Какое первое non-ellipse требование к `SectionShape`: legacy `Priam`/`Kr`, rounded sections или другая shape family?
- Когда equipment-only balance может выйти из `Experimental`, и какая physical model должна появиться первой?
- Нужны ли diagnostics stable machine-readable codes до следующей UI-работы?
- Нужен ли visual regression testing до крупного public UI redesign?

## 4.20 Копируемый контекст для UI-обсуждения

Этот блок можно вставить в будущее обсуждение UI:

```text
Underwater Vehicle Designer - Vite + TypeScript frontend-only engineering SPA для 2D/3D обводов корпуса подводного аппарата, проверок размещения оборудования, equipment-only balance diagnostics и SVG/CSV/JSON export.

Текущий `HEAD` уже имеет application layer: `ProjectInputs`, `ProjectCommand`, `reduceProject()`, `ProjectStore`, `deriveProject()`, `ProjectEvaluation` и `projectEvaluationRuntime`. Текущий flow: DOM/import adapters -> ProjectCommand -> ProjectStore.dispatch()/reduceProject() -> ProjectInputs -> deriveProject() -> ProjectEvaluation -> coherent publication -> DOM/Canvas/Three.js/export adapters.

`ProjectInputs` владеет engineering inputs: profile, equipment and balanceSettings. `ProjectViewState` владеет showGrid, showPoints and scene3dSettings. `ProjectEvaluation` владеет derived hullGeometry, theoreticalDrawing, constraints and equipment-only balance. JSON v2 сохраняет serializable `ProjectInputs + ProjectViewState`, а не `ProjectEvaluation`.

UI не должен дублировать geometry formulas, coordinate transforms, containment checks или balance rules. Canvas, tables, metrics, Three.js, profile SVG/CSV and theoretical SVG должны использовать `ProfileSnapshot`/`ProjectEvaluation` publication. View-only changes должны переиспользовать `projectEvaluationRuntime.rerender()` и не вызывать `deriveProject()`.

Текущий UI - public demo/workbench с реальным статическим hero render, Body/SNAME-NED coordinate note, geometry labels `Базовая формула`/`Классическая методика`, 3D modes `Сплошной`/`Рентген`, independent section controls, native number inputs и experimental `Баланс оборудования` disclaimer.

Главный оставшийся UI architecture debt - не отсутствие canonical state. Проблема в том, что `src/app/main.ts` все еще широк: DOM binding, actions, runtime commits, view state, rendering orchestration, import/export/downloads, notifications and lifecycle. Предпочтительны небольшие panel/view-model seams до framework migration.

Не представлять текущий balance как full hydrostatics. Он equipment-only. Future physical models должны разделять hydrodynamic fairing, placement envelope, structural mass model и watertight envelope.

Перед крупным UI-изменением нужно решить product mode, desktop/mobile scope, selected equipment state, camera persistence, dirty/autosave policy, diagnostics presentation и нужен ли JSON v3 view/session contract.
```

## 4.21 Правила обновления

Обновляйте этот документ, когда происходит одно из изменений:

- Добавлены новые `ProjectCommand` variants или command history.
- Изменены `ProjectInputs`, `ProjectViewState`, `ProjectEvaluation` или JSON schema.
- Responsibilities `main.ts` перенесены в explicit adapters/controllers.
- Принят UI framework.
- Реализованы 2D/3D selection или direct manipulation.
- Добавлены non-ellipse variants для `SectionShape`.
- Equipment-only balance заменен или дополнен full hydrostatics.
- Camera, selection, dirty state, autosave или recent projects стали persisted или shareable.
