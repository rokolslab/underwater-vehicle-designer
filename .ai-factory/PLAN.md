# План реализации: минимальный ProjectStore и атомарный JSON import

Branch: master
Created: 2026-08-03

## Original Request
aif-plan fast ввести минимальный ProjectStore и атомарный JSON import workflow поверх существующего ProjectInputs/normalization seam без big-bang rewrite

## Settings
- Testing: yes
- Logging: verbose
- Docs: no

## Roadmap Linkage
Milestone: "Ввести `ProjectStore` и атомарный import workflow"
Rationale: Инкремент вводит единственного владельца канонического `ProjectInputs` и заменяет DOM round-trip при JSON import одной публикацией нормализованного состояния.

## Research Context
Source: .ai-factory/RESEARCH.md (Active Summary, Updated: 2026-07-31 09:58, SHA256: 5c578201f6ff69631c8cd1ae21552b5160bec965fd1445faaa0a0dbb468270f4)

Тема: Сопоставление заявленной и фактической архитектуры и выбор целевой архитектуры проекта.

Цель: Подготовить эволюционный рефакторинг без полного rewrite, сохранив чистое расчётное ядро, единый координатный контракт и существующие regression tests.

Ограничения:
- Проект остаётся frontend-only Vite + TypeScript SPA без необходимости в microservices или backend.
- Three.js, Canvas, DOM, browser files, logging и export являются adapters.
- Рефакторинг должен быть поэтапным, без big-bang rewrite и без нарушения JSON migrations.

Решения:
- Целевая архитектура: Modular Monolith + Functional Core + Explicit Application Layer + Browser Adapters.
- Ввести канонический `ProjectInputs` и единый `ProjectStore`; DOM перестаёт быть источником истины.
- Разделить сохраняемые `ProjectInputs`, локальный `ProjectViewState`, производный `ProjectEvaluation` и versioned persistence DTO `ProjectDocumentV3`.
- Объединить DOM- и JSON-нормализацию вокруг общих pure normalizers.

Подтверждённые проблемы:
- `main.ts` совмещает composition root, application controller, import workflow, derived calculations и render orchestration.
- Состояние распределено между DOM controls, module-level variables и closures; `ProjectState` собирается заново при каждом `update()`.
- `ProjectState` и `SerializableProjectState` дублируют один aggregate contract.

Открытые вопросы:
- Нужен ли минимальный custom store/reducer или достаточно application controller с immutable state и `dispatch`.

Сигналы успеха:
- Import заменяет project state атомарно и не использует DOM как промежуточное хранилище.
- Import → add equipment сохраняет уникальность ID; import → export сохраняет gravity.
- Все изменения проекта проходят через команды/reducer или эквивалентный единый application API.
- DOM и JSON используют одни pure normalizers.

## Scope Boundary

- `ProjectStore` владеет только нормализованным `ProjectInputs`: profile, equipment и balance settings.
- Атомарность означает один commit полного `ProjectInputs` после успешных decode, migration, normalization и preparation; при ошибке до commit store и persisted view state не меняются.
- `showGrid`, `showPoints` и `scene3dSettings` получают отдельного in-memory владельца вне `ProjectStore`; controls становятся их projection, а camera остаётся runtime-only и не входит в JSON v2.
- DOM, Canvas и WebGL rendering не становятся транзакционными в этом инкременте. Post-commit render failure не откатывает canonical state и не выдаётся за ошибку чтения/парсинга файла.
- Rendering не запускается store subscriber в этом инкременте: import сначала применяет prepared view state и один canonical commit, затем синхронизирует controls и вручную выполняет один render из committed snapshots.
- Вне scope: reducer/command bus, undo/redo, `deriveProject()`, `ProjectEvaluation`, JSON v3, изменение migrations, перенос каталогов, geometry formulas и renderer lifecycle.

## Commit Plan
- **Commit 1** (after Tasks 1-3): `refactor(application): add project store and import projections`
- **Commit 2** (after Tasks 4-5): `refactor(app): adopt atomic project import workflow`

## Tasks

### Phase 1: Canonical Store
- [x] Task 1: Ввести минимальный синхронный `ProjectStore` поверх существующего `ProjectInputs`.
  - Deliverable: создать `src/application/project/store.ts` с явным API `getSnapshot()`, `setProfile()`, `setEquipment()`, `setBalanceSettings()`, `replaceProject()` и `subscribe()`; mutation methods возвращают фактически committed snapshot. Дополнить `src/application/project/defaults.ts` единым `createDefaultProjectInputs()` на существующих profile/balance defaults без дублирования чисел.
  - Expected behavior: store принимает уже нормализованные inputs, явно копирует и замораживает owned root/profile/balance/equipment array, каждый equipment item и его `position`/`dimensions`; мутация caller-owned объектов после вызова не меняет snapshot. Reference-equal slice/root update является no-op без нового root и notification; реальный slice update сохраняет identity остальных slices.
  - Notification contract: `subscribe()` не вызывает listener немедленно; unsubscribe идемпотентен; список registrations фиксируется на начало commit; ошибка listener не мешает остальным и пробрасывается после рассылки без rollback committed state; reentrant commit во время notification явно запрещён; duplicate subscriptions считаются отдельными registrations.
  - Files: `src/application/project/store.ts`, `src/application/project/store.test.ts`, `src/application/project/defaults.ts`.
  - Logging requirements: pure store/default factory не импортируют `logger`, DOM, persistence или rendering и не логируют state transitions или listener errors.
  - Dependency notes: использует только `ProjectInputs` и его leaf contracts; не вводить reducer, command bus, async queue, history, dirty state или derived evaluation. Блокирует Tasks 4-5; Tasks 2-3 могут выполняться независимо от store.

### Phase 2: Persistence Projections
- [x] Task 2: Ввести явный persisted view state и двусторонние projections на app boundary.
  - Deliverable: создать `src/app/projectProjection.ts` с минимальным `ProjectViewState` (`showGrid`, `showPoints`, `scene3dSettings`) и pure functions для разделения нормализованного `SerializableProjectState` на `{ inputs: ProjectInputs, view: ProjectViewState }` и обратной сборки свежего `SerializableProjectState` из canonical inputs и view state.
  - Expected behavior: canonical projection перечисляет profile fields явно и не переносит `slenderness`, `diameter` или view flags в `ProjectInputs`; export projection вычисляет `slenderness = length / height`, `diameter = height`, сохраняет scene settings, equipment, density и gravity. Camera не входит в view state/JSON. Controls не являются владельцем view state.
  - Projection seam: расширить `projectProfileInputsToProfileState()` или добавить соседний pure projector, принимающий canonical `ProjectProfileInputs` и view flags напрямую, чтобы `main.ts` не конструировал фиктивный `NormalizedProjectProfileResult`.
  - Files: `src/app/projectProjection.ts`, `src/app/projectProjection.test.ts`, `src/application/project/normalize.ts`, `src/application/project/normalize.test.ts`, `src/app/projectState.ts` только для удаления дублирующего ownership и сохранения compatibility assembly.
  - Logging requirements: projections и profile projector не импортируют logger и не логируют project contents; persistence parser сохраняет существующие adapter logs без переноса в application/store.
  - Dependency notes: `src/application/project/*` не импортирует `SerializableProjectState`; DTO coupling остаётся только в `src/app`/persistence boundary. Не менять JSON v2 shape, `exportedAt`, migrations или warning strings. Независима от Task 1, блокирует Tasks 3-5.

### Phase 3: Import Preparation
- [x] Task 3: Подготовить JSON import без mutation canonical или view state.
  - Deliverable: создать `src/app/projectImport.ts` с `prepareProjectImport(json)`, который вызывает существующий `parseProjectJson()`, использует projections из Task 2 и возвращает discriminated result с prepared inputs/view, существующими warnings и `migratedFromVersion`; функция не принимает store и не пишет DOM/controls.
  - Expected behavior: invalid JSON, unsupported schema и любой parser failure возвращают прежний human-readable error contract и не могут изменить application state; normalizable unsafe fields остаются успешным import с warnings; successful preparation сохраняет полную нормализованную числовую точность, gravity и deterministic unique equipment IDs.
  - Files: `src/app/projectImport.ts`, `src/app/projectImport.test.ts`, `src/modules/persistence/project-json.ts` только для минимального type/export wiring без schema, migration, warning или normalization changes.
  - Logging requirements: preparation не добавляет собственных logs и не логирует raw JSON/project object; tests допускают существующие logs `parseProjectJson()`. Commit log относится только к browser boundary в Task 4.
  - Dependency notes: зависит от Task 2; Task 1 не требуется для preparation. Не вводить новую parse metadata/error-code model в этом инкременте и не называть существующие string errors/warnings structured diagnostics.

### Phase 4: Incremental Runtime Adoption
- [ ] Task 4: Сделать store владельцем canonical inputs и применить prepared import одним commit без повторного чтения DOM.
  - Deliverable: создать store и отдельный in-memory `ProjectViewState` при bootstrap; заменить `equipmentItems` и gravity closure; направить profile/equipment/balance/view events в соответствующих владельцев; вынести небольшой testable apply seam с порядком `prepare -> replace view state -> store.replaceProject() -> project controls -> renderCommittedState(inputs, view)`.
  - Profile edits: adapter получает exact текущий profile из store, читает только изменённый control, применяет существующую interactive policy и commit-ит результат; equipment, density, grid, scene и resize events не перечитывают profile controls. Добавить явный adapter API для `lastEdited`: successful import устанавливает `height`, reset устанавливает `slenderness`, render его не меняет.
  - Import behavior: browser handler использует монотонный request token с policy latest-selection-wins; stale read/prepare не commit-ит, не показывает notice и не очищает input активной операции. Pre-commit read/parse failure оставляет store/view по identity; post-commit control/render failure не откатывает state и показывается как ошибка отображения, а не чтения файла.
  - Export/reset behavior: export на момент click строит свежий DTO из `store.getSnapshot()` и in-memory view state, не использует DOM или stale `currentProjectState`; reset одним replace устанавливает default profile, empty equipment, density `1025`, gravity `9.80665`, grid/points `true`, `lastEdited = "slenderness"`, сохраняя текущие scene settings и camera.
  - Scene behavior: scene controls обновляют in-memory view state; section bounds нормализуются единообразно от canonical `length`, `breadth / 2`, `height / 2`; уменьшение профиля commit-ит clamped scene settings в view owner, а не только в controls.
  - Files: `src/app/main.ts`, `src/app/appState.ts`, `src/app/projectImport.ts`, `src/app/projectState.ts`, `src/modules/ui/controls.ts` только если нужен field-specific adapter helper; удалить либо переписать `src/app/application-gravity.test.ts`, поскольку gravity больше не принадлежит `AppStateController`.
  - Logging requirements: сохранить текущие user warnings/notices; добавить один DEBUG `projectImportCommitted` с migration flag, warning count и equipment count без raw payload; различать WARN/ERROR phases `fileRead`, `prepare`, `postCommitControls`, `postCommitRender`; не логировать каждый store update/render.
  - Dependency notes: зависит от Tasks 1-3. Store subscribers не запускают rendering в этом инкременте. Существующий calculation/render body может остаться в `main.ts`, но должен принимать committed inputs/view и не читать canonical values из DOM; не извлекать `deriveProject()` и не переписывать Canvas/Three.js lifecycle.

### Phase 5: Regression Gate
- [ ] Task 5: Закрепить ownership, атомарность, precision и compatibility без дублирования существующих matrices.
  - Store tests: initial/deep ownership, mutation caller arguments, slice identity/no-op, full replace, unsubscribe, duplicate registrations, listener failure с продолжением рассылки, запрет reentrant commit и отсутствие browser/persistence/rendering/logger dependencies.
  - Projection/import tests: exact split/reverse projection canonical + view, отсутствие aliases/view в `ProjectInputs`, values с precision больше четырёх знаков, failed prepare без mutation/notification, warnings/migration passthrough, один integration case import → add equipment и fresh export из store/view.
  - Runtime tests: один canonical commit и один render на successful import; field-specific edit/view/equipment/density events не изменяют untouched exact profile/balance slices; stale import A после committed B игнорируется; post-commit render throw сохраняет imported state/export; reset использует non-default imported density и проверяет default density/gravity/equipment, сохранение scene/camera semantics.
  - Existing coverage: сохранить и прогнать `project-json.test.ts`, `placement.test.ts`, normalization и successful import/export E2E без копирования их полной schema/migration/ID matrix; удалить старый gravity wiring block из `dom-contract.test.ts`, но сохранить DOM IDs, UI text, touch, WebGL fallback и resize contracts; не заменять удалённый block новыми source-string assertions на store calls.
  - Browser coverage: добавить invalid JSON import после изменения проекта с Playwright dialog handler; сравнивать `before.project`/`after.project`, а не `exportedAt`; изменить reset fixture на non-default density, чтобы тест доказывал reset.
  - Files: `src/application/project/store.test.ts`, `src/app/projectProjection.test.ts`, `src/app/projectImport.test.ts`, `src/application/project/dependency-contract.test.ts`, `src/app/appState.test.ts`, `src/app/dom-contract.test.ts`, `src/modules/persistence/project-json.test.ts`, `src/modules/equipment/placement.test.ts`, `tests/e2e/import-export.spec.ts`; `src/app/application-gravity.test.ts` удалить или полностью переписать под новый owner.
  - Logging requirements: store/projection tests подтверждают отсутствие собственных log side effects; import tests не запрещают существующие parser logs; browser tests проверяют user-visible phase semantics, а не точное число DEBUG logs; payloads не выводятся целиком.
  - Dependency notes: зависит от Tasks 1-4. Verification: `npm run test -- src/application/project/store.test.ts src/app/projectProjection.test.ts src/app/projectImport.test.ts src/application/project/dependency-contract.test.ts src/app/appState.test.ts src/modules/persistence/project-json.test.ts`, затем `npm run test`, `npm run test:e2e -- tests/e2e/import-export.spec.ts --project=chromium`, `npm run build` и `npm run check:encoding`. Docker `app` используется только для Vitest/build/encoding; Playwright запускается локально с установленным Chromium либо через `docker compose -f compose.e2e.yml run --rm e2e`.
