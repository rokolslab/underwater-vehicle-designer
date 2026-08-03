# План реализации: ProjectStore commands/reducer

Ветка: `feature/project-store-commands-reducer`
Создан: 2026-08-03

## Original Request

for the next increment, likely ProjectStore commands/reducer.

## Настройки

- Тестирование: да
- Логирование: standard
- Документация: да, обязательный checkpoint через `/aif-docs`

## Связь с roadmap

Веха: "Актуальный фокус: command/reducer layer поверх `ProjectStore`"
Обоснование: roadmap называет command/reducer layer следующим increment после canonical `ProjectInputs`, общего normalization pipeline и `deriveProject()`; отдельного checkbox milestone для этого seam пока нет.

## Research Context

Source: `.ai-factory/RESEARCH.md` (Active Summary, Updated: 2026-07-31 09:58, SHA256: cea62af8da0c2b5dc6aa6bde3bfa1d5183d6f8f574c35b8e15401b1e6e6741be)

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

## Границы increment

Входит в scope:

- discriminated `ProjectCommand` для замены профиля, добавления/изменения/удаления оборудования, замены balance settings и атомарной замены проекта;
- pure `reduceProject(state, command)` с immutable ownership, structural sharing и текущими no-op semantics;
- единый `ProjectStore.dispatch()` вместо публичных slice setters;
- перевод canonical mutation paths в `main.ts` на commands с сохранением явного runtime orchestration;
- unit, integration, dependency-contract и релевантные E2E regressions;
- синхронизация архитектурной документации.

Не входит в scope:

- `ProjectViewState`, `lastEdited`, DOM raw-input parsing или Three.js settings в reducer;
- undo/redo, command history, middleware, async commands или generic command bus;
- production subscription `ProjectStore` → `projectEvaluationRuntime`;
- value-based equality или новые semantic no-op rules;
- `SectionShape`, новые persistence schema или изменение публичного JSON;
- перемещение каталогов в целевое дерево `core/`/`adapters/`.

## Ключевые решения

- `ReplaceProfile`, `ReplaceBalanceSettings` и `ReplaceProject` несут уже подготовленные canonical значения; DOM/JSON normalization остаётся до `dispatch()`.
- Equipment commands несут typed edit intents по стабильному ID. Их state-dependent clamp, fallback, shape defaults и ID allocation выполняет logger-free pure transition внутри reducer, устраняя collection read-modify-write из `main.ts`.
- Команды не содержат callback вроде `idFactory`; optional requested ID является data, а default ID вычисляется детерминированно из текущей коллекции.
- Reducer, commands и store не логируют и не импортируют logger. Текущие внутренние equipment success/clamp/unknown-ID logs намеренно удаляются как side effects pure transition и не переносятся в adapter без пользовательской ошибки; import/runtime boundary logging сохраняется у текущих владельцев.
- `dispatch()` возвращает точный committed frozen snapshot. `main.ts` явно передаёт его в `projectEvaluationRuntime.commit()` после обязательных adapter post-steps.
- Если reducer вернул прежний root, canonical state считается неизменённым: `main.ts` не вызывает derive/render для такого no-op command.
- Production subscription не вводится: синхронный listener меняет import ordering, а listener error возникает уже после сохранённого store commit.
- Старые `setProfile`, `setEquipment`, `setBalanceSettings` и `replaceProject` удаляются после миграции callers; compatibility wrappers не нужны, поскольку persisted или внешний контракт отсутствует.

## План коммитов

- **Коммит 1** (после задач 1-5): `refactor: route project mutations through reducer`
- **Коммит 2** (после обязательного completion docs checkpoint и задачи 6): `docs: document project command workflow`

## Задачи

### Фаза 1: Pure command boundary

- [x] **Задача 1: Определить command contract и сделать equipment transitions пригодными для pure reducer**
  - Создать `src/application/project/commands.ts` с исчерпывающим discriminated union для `ReplaceProfile`, `AddEquipment`, `UpdateEquipment`, `DeleteEquipment`, `ReplaceBalanceSettings` и `ReplaceProject` (финальные имена сверить с принятой TypeScript naming convention).
  - Для profile/balance/project replacement использовать canonical application types; для equipment определить typed edit-intent contract, который допускает precanonical числовые значения и нормализуется state-dependent transition. Не включать DOM nodes/strings, view settings, persistence DTO, callbacks или presentation diagnostics.
  - Назначить `EquipmentUpdate`/эквивалентному edit-intent type одного владельца, используемого commands, UI adapter и transition logic; не дублировать форму patch. Явно сохранить текущую семантику: отсутствующий или `undefined` `displacedVolume` не очищает, а сохраняет прежнее значение.
  - Вынести deterministic equipment transitions в отдельный logger-free module либо полностью удалить logger dependency из `src/modules/equipment/placement.ts`; одного pure named export в module с runtime logger import недостаточно.
  - Сохранить текущие ID collision/gap reuse, shape defaults, finite/non-finite clamp, coordinate fallback, name handling, stable ordering, update и unknown-ID no-op правила без дублирования логики в reducer.
  - Считать существующие equipment success/clamp/unknown-ID logs внутренним noisy logging и намеренно удалить их, не создавая diagnostics API в этом increment. Пользовательские validation/import/runtime сообщения остаются у adapter boundary owners.
  - Сохранить существующий exported equipment API только там, где остаются реальные callers; не добавлять compatibility wrappers без необходимости.
  - Расширить `src/modules/equipment/placement.test.ts` для затронутых normalization/ID contracts и прогнать связанные `src/modules/persistence/project-json.test.ts` и `src/modules/ui/equipment.test.ts`, поскольку persistence и UI используют те же transitions/types.
  - **Логирование:** в `commands.ts`, reducer-facing equipment transitions и их unit tests логов быть не должно; не импортировать `src/shared/logger.ts`. На этой задаче не добавлять новые adapter logs.
  - **Проверка:** targeted Vitest для placement, persistence JSON и UI equipment tests; strict TypeScript build после стабилизации типов.
  - **Зависимости:** нет.

- [x] **Задача 2: Реализовать pure `reduceProject()` и immutable snapshot ownership**
  - Создать `src/application/project/reducer.ts`; перенести в application transition boundary clone/freeze helpers, необходимые и reducer, и инициализации store, без второго владельца snapshot semantics.
  - Для changed command возвращать новый frozen root, копировать/freeze caller-owned payload и сохранять identity нетронутых slices.
  - Для reference-identical replacement, нового project shell с теми же тремя slice references и unknown equipment ID возвращать исходный `ProjectInputs`; не вводить value equality. Для mixed replacement копировать только changed caller-owned slices. Для известного equipment ID сохранить текущую семантику update, включая commit для пустого patch, если она уже создаёт новый item.
  - Реализовать exhaustive switch так, чтобы новый command variant давал compile-time failure до добавления transition.
  - Создать `src/application/project/reducer.test.ts`: все command variants, caller ownership, deep freeze, structural sharing, root/shell/slice-reference no-op, mixed replacement, default/requested/colliding equipment IDs, shape changes, unknown IDs и сохранение `gravityMPerS2` при несвязанных commands.
  - В этой же фазе расширить `src/application/project/dependency-contract.test.ts`: независимо обходить runtime closures `reducer.ts` и `store.ts`, следовать value-bearing imports/re-exports и отклонять запрещённые relative и bare specifiers (`three`, Vite/browser adapters, persistence, rendering, UI, logger). Type-only imports не должны становиться runtime edges.
  - **Логирование:** reducer и tests не логируют входы, snapshots, transitions или ошибки; ошибки остаются return/throw semantics и проверяются напрямую.
  - **Проверка:** targeted Vitest для reducer, placement и dependency contract до подключения store.
  - **Зависимости:** задача 1.

- [x] **Задача 3: Перевести `ProjectStore` на `dispatch()` без изменения notification semantics**
  - Обновить `src/application/project/store.ts`: инициализировать owned snapshot через общий ownership helper, вызвать reducer из `dispatch(command)` и уведомлять listeners только при новом root reference.
  - Сохранить текущие contracts для обычных `Error`: snapshot присваивается до notification, registrations snapshot фиксируется на начало notification, duplicate subscriptions допустимы, unsubscribe идемпотентен, все listeners вызываются после первой ошибки, первая обычная ошибка затем rethrow, commit не откатывается, state-changing reentrant dispatch запрещён. Не расширять в этом refactor contract для `throw null`/`throw undefined` без отдельного решения.
  - Сохранить порядок no-op check до reentrancy guard; reducer throw не должен менять snapshot или вызывать listeners.
  - Добавить `dispatch()` и перевести store tests, но не удалять старые setters до миграции production/test callers в задачах 4-5; это временное состояние до первого checkpoint, а не новый compatibility contract.
  - Обновить `src/application/project/store.test.ts` для dispatch API, включая notification/no-notification, listener failure с обычным `Error`, reentrant changed command и reentrant no-op. Не добавлять искусственный reducer-failure test без поддерживаемого throwing command contract.
  - **Логирование:** store не логирует dispatch, payload, listener failures или reentrancy. Caller/runtime остаётся единственным владельцем boundary error logging.
  - **Проверка:** targeted Vitest для `store.test.ts` и `reducer.test.ts`.
  - **Зависимости:** задача 2.

### Фаза 2: Application wiring и regressions

- [x] **Задача 4: Перевести canonical mutation paths в `main.ts` на commands**
  - Обновить `src/app/main.ts`: профиль, water density/balance settings, add/update/delete equipment, import и reset должны вызывать `projectStore.dispatch()`; удалить adapter-side equipment read-modify-write и ненужные imports.
  - Передавать returned committed snapshot напрямую в `projectEvaluationRuntime.commit()` ровно один раз только для changed root; no-op command не запускает derive/render.
  - Сохранить adapter-side previous-shape check: при shape change stale dimensions не входят в edit intent, а pure transition применяет defaults новой shape. Запрещён только collection-level read-modify-write оборудования.
  - Сохранить явный import ordering: prepare без mutation → replace view → dispatch `ReplaceProject` → write controls → derive/publish/render. Controls failure после dispatch оставляет новый store/view и старую publication; derive failure оставляет новую store state и старую publication; render failure оставляет новую publication.
  - Сохранить отдельный reset ordering: сбросить `lastEdited` и grid/points view state → dispatch defaults → write controls → derive/render; scene settings не сбрасывать.
  - Оставить grid, points, scene settings, resize и panel/focus state вне commands и использовать `rerender()` без derive.
  - Сохранить export boundary: JSON читает свежий `projectStore.getSnapshot()`, engineering exports используют последнюю coherent publication.
  - **Логирование:** не логировать успешный dispatch или полные payload/snapshots. Сохранить существующие standard ERROR/WARN события для import, controls, derive и render у текущего boundary owner; не дублировать одну ошибку в dispatch и runtime.
  - **Проверка:** focused app/runtime/import tests для production wiring; окончательное удаление setters выполняется после миграции test callers в задаче 5.
  - **Зависимости:** задача 3.

- [x] **Задача 5: Закрепить integration, failure-ordering и dependency contracts**
  - Обновить `src/app/projectEvaluationRuntime.test.ts`, `src/app/application-gravity.test.ts`, `src/app/projectImport.test.ts` и `src/app/dom-contract.test.ts` на command API без хрупкой привязки к большому inline literal.
  - Заменить subscription-oriented runtime test на explicit harness `dispatch result → runtime.commit`; production subscription не создавать и не использовать как proof command flow.
  - Зафиксировать browser-free regressions только на доступных seams: changed command даёт один derive, no-op command и view-only rerender дают ноль derive, store/publication расходятся ожидаемо при derive failure, новая publication сохраняется при render failure, JSON source остаётся fresh store snapshot.
  - Не импортировать DOM-heavy `main.ts` в Node Vitest и не извлекать новый controller только ради тестов. Observable import/reset ordering проверять существующим Playwright flow; private controls-failure injection не объявлять покрытой без отдельного seam.
  - Сохранить import → add equipment → export уникальность ID, сохранение imported gravity, reset profile/mode/stations/balance defaults, grid/points reset, scene settings preservation, shape-change defaults и invalid-import nonmutation в релевантных unit/E2E regressions.
  - После миграции всех production и test callers удалить `setProfile`, `setEquipment`, `setBalanceSettings` и `replaceProject`; проверить repository-wide отсутствие callers, не оставлять wrappers.
  - **Логирование:** test spies проверяют отсутствие console/logger side effects в pure command/reducer/store closure и ровно один injected runtime `onError` для `derive`/`render`; не требовать exactly-once от production import logging, где parser и application boundary имеют разных текущих владельцев.
  - **Проверка:** focused Vitest по reducer/store/dependency/dom/runtime/import/gravity, затем обязательный `npm run test:e2e`; недоступное Playwright environment считать blocker.
  - **Зависимости:** задача 4.

<!-- Commit checkpoint: задачи 1-5 -->

- [x] **Задача 6: Синхронизировать factual context и выполнить полные quality gates**
  - В рамках разрешённых factual deltas `/aif-implement` обновить structural map/key entry points в `AGENTS.md`: добавить `commands.ts`/`reducer.ts`, уточнить роли `store.ts` и `main.ts`, зафиксировать pure/no-logger boundary.
  - В рамках разрешённого factual architecture delta `/aif-implement` обновить `.ai-factory/ARCHITECTURE.md`: заменить утверждение «ещё не reducer/command bus», скорректировать aspirational subscription example и сохранить явные import failure-ordering semantics. Если изменение выходит за factual delta, передать файл владельцу `/aif-architecture`.
  - Использовать единственный обязательный completion docs checkpoint `/aif-implement` с `/aif-docs` для `docs/architecture.md` и `docs/testing.md`: architecture описывает `DOM event → command → reducer → ProjectStore → explicit runtime commit → publication`, command scope, view-state boundary и отсутствие production subscription; testing описывает reducer/store matrix, dependency closure, no-log assertions и E2E gates.
  - В `docs/testing.md` удалить противоречивые устаревшие утверждения об отсутствии committed browser suite при наличии `tests/e2e/import-export.spec.ts` и `npm run test:e2e`.
  - Не редактировать roadmap или research этим планом автоматически; их владельцы `/aif-roadmap` и `/aif-explore` могут закрыть focus/open question отдельным шагом после verify.
  - **Логирование:** документация должна описывать standard boundary logging и запрет логов в reducer/store; production logging в этой задаче не менять.
  - **Проверка:** выполнить `npm run check:encoding`, `npm run test`, `npm run build` и обязательный `npm run test:e2e`; после docs checkpoint повторить `npm run check:encoding`. Зафиксировать недоступный обязательный gate как blocker, а не как pass.
  - **Зависимости:** задача 5.

<!-- Commit checkpoint: completion docs checkpoint + задача 6 -->

## Критерии приёмки

- Каждый canonical project mutation проходит через typed `ProjectCommand` и `ProjectStore.dispatch()`; старые slice setters и equipment read-modify-write в `main.ts` отсутствуют.
- `reduceProject()` является browser-free, logger-free и детерминированным для пары state/command.
- Store продолжает владеть deeply frozen snapshots и сохраняет прежние no-op, notification, listener-error и reentrancy contracts.
- Profile/JSON normalization, `ProjectViewState`, `lastEdited` и rendering lifecycle не перемещены в reducer.
- Import/reset сохраняют существующий phase ordering; dispatch не запускает derive через production subscription.
- Один changed canonical command вызывает ровно один derive; no-op command и view-only событие не вызывают derive.
- Import → add equipment сохраняет уникальные IDs; unrelated commands не теряют imported gravity.
- Focused regressions, полный Vitest suite, production build, encoding check и обязательный Playwright E2E suite проходят.
- Архитектурная документация соответствует фактическому command/reducer flow и его failure semantics.

## Риски и меры

- **Риск:** reducer вызовет equipment helper с logging side effect. **Мера:** очистить transition path и закрепить dependency/no-console tests до подключения reducer.
- **Риск:** subscription создаст derive до завершения import controls phase. **Мера:** сохранить explicit orchestration и тестировать failure ordering.
- **Риск:** dispatch throw после listener error будет ошибочно воспринят как отклонённый command. **Мера:** не использовать runtime как store listener и документировать commit-before-notification-error contract.
- **Риск:** новый clone/freeze path изменит slice identity или позволит caller mutation. **Мера:** единый ownership helper и reducer/store identity/deep-freeze tests.
- **Риск:** generic patches размоют domain intent и потеряют поля balance settings. **Мера:** узкие command variants и regressions для `gravityMPerS2`.
- **Риск:** source-text `dom-contract` даст ложную уверенность или станет хрупким. **Мера:** проверять устойчивый command ownership contract и дополнять behavior tests.
