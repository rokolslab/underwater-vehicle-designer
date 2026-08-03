# План реализации: чистый deriveProject и единый ProjectEvaluation

Ветка: `feature/derive-project-evaluation`
Создан: 2026-08-03

## Original Request
Извлечь чистый deriveProject() из main.ts, ввести ProjectEvaluation и перевести rendering adapters на единый расчетный результат
Границы плана
- Контракт ProjectEvaluation.
- Pure deriveProject(ProjectInputs).
- Geometry snapshot, theoretical drawing, constraints и equipment balance в одном расчетном графе.
- Перевод main.ts на готовую evaluation.
- Удаление временного ProjectState, если больше не нужен.
- Unit/regression tests и dependency gate.
- Обновление архитектурной документации и roadmap.
Не включаем
- SectionShape.
- Priam/Kr.
- JSON v3.
- Reducer/command bus.
- Mass properties и полный ЦВ.
- Массовый перенос modules в core/adapters.

## Настройки
- Testing: yes
- Logging: verbose
- Docs: yes

## Связь с roadmap
Веха: "Извлечь `deriveProject()` и сократить `main.ts` до composition root"
Обоснование: план централизует существующие geometry, drawing, constraints и equipment-only balance calculations, после чего `main.ts` оставляет расчетному слою только canonical inputs и передает единый результат browser adapters.

## Research Context
Source: `.ai-factory/RESEARCH.md` (Active Summary, Updated: 2026-07-31 09:58, SHA256: `c8f3157cc0052ce02e08a66bcae4807a5f8629d42cc1bef558bf22c19056722c`)

Тема: Извлечение единого чистого расчетного графа проекта из текущей UI orchestration.

Цель: Продолжить эволюционный рефакторинг без полного rewrite, сохранив чистое расчетное ядро, единый координатный контракт и существующие regression tests.

Ограничения:
- Проект остается frontend-only Vite + TypeScript SPA.
- Body/SNAME-NED остается единственной современной доменной системой координат.
- Geometry, equipment и balance должны оставаться чистыми TypeScript-модулями.
- Three.js, Canvas, DOM, browser files, logging и export являются adapters.
- Рефакторинг выполняется поэтапно без нарушения JSON migrations.

Решения:
- Целевая архитектура: Modular Monolith + Functional Core + Explicit Application Layer + Browser Adapters.
- Канонический ProjectInputs отделен от ProjectViewState, производного ProjectEvaluation и persistence DTO.
- Чистый deriveProject(projectInputs) централизует geometry snapshot, constraints, balance results и presentation-neutral drawing data.
- main.ts должен содержать только bootstrap, wiring и subscriptions adapters.

Подтвержденные проблемы:
- main.ts все еще совмещает application controller, derived calculations и render orchestration.
- ProfileState смешивает domain inputs, compatibility aliases и display settings.
- Domain-like geometry, equipment constraints и balance имеют logging side effects.

Сигналы успеха:
- Rendering и export используют один производный geometry contract и не пересчитывают результаты самостоятельно.
- Geometry, equipment constraints и balance не импортируют logger, DOM, Canvas, Three.js или Vite runtime.
- Полностью рассчитанный ProjectEvaluation публикуется атомарно.

## Границы решения

- `deriveProject(inputs: ProjectInputs)` получает только canonical normalized inputs и не принимает `ProjectViewState`, DOM controls, renderer instances или logger.
- `ProjectEvaluation` содержит `ProfileSnapshot`, `TheoreticalDrawing`, `EquipmentConstraintReport` и `EquipmentBalanceResult`; текущий balance сохраняет discriminator equipment-only buoyancy и не становится полным ЦВ корпуса.
- `showGrid`, `showPoints`, `scene3dSettings`, camera, focus и размеры canvas остаются view/runtime state. Canvas получает grid/points отдельными render options, а 3D settings нормализуются на adapter boundary по extents готовой evaluation.
- Rendering adapters сохраняют узкие сигнатуры и получают нужные поля одного `ProjectEvaluation`; они не должны зависеть от всего aggregate только ради удобства.
- JSON import/export продолжает работать через `ProjectInputs + ProjectViewState`, не сериализует derived results и не меняет `schemaVersion: 2`, migrations или document shape.
- `deriveProject()` не перехватывает неожиданные исключения и не подменяет их `undefined` constraints либо fake empty-equipment balance. Runtime вычисляет evaluation в локальную переменную и одним присваиванием публикует coherent пару `{ inputsSnapshot, evaluation }` только после полного успеха; это runtime result, а не новый persisted/domain `ProjectState`.
- Prepare/controls/derive/render phases имеют разную failure semantics: pre-commit failure не меняет store; post-commit controls failure сохраняет commit без запуска derive; derive failure сохраняет commit и предыдущую опубликованную пару; render failure сохраняет commit и новую пару, хотя browser adapters могут обновиться частично. Каждый ERROR имеет одного владельца phase log без двойного логирования.
- View-only события и resize повторно используют последнюю успешную evaluation. Profile, equipment и balance input commits запускают новую derivation; name-only equipment changes также считаются input change, поскольку display names входят в constraint issues.
- `SectionShape`, `Priam`/`Kr`, JSON v3, reducer/command bus, mass properties, `WatertightEnvelope`, полный ЦВ и массовый перенос каталогов остаются отдельными follow-up.

## Критерии приемки

- Один вызов `deriveProject(ProjectInputs)` детерминированно возвращает coherent immutable root со связанными geometry, theoretical drawing, constraints и equipment-only balance results; runtime публикует его только вместе с точным `ProjectInputs` snapshot, из которого он получен.
- Calculation path от `deriveProject()` до leaf geometry/equipment/balance helpers не импортирует глобальный logger и не имеет DOM, Canvas, Three.js, persistence, browser или Vite side effects.
- `ProjectEvaluation` не содержит `ProjectViewState`; переключение grid/points, 3D settings и resize не пересчитывает engineering evaluation.
- Current-formula и legacy DSNP_PA, независимые `B`/`H`, ненулевая ЦВК, equipment containment/intersections, invalid equipment и отличимые density/gravity сохраняют существующие результаты.
- Canvas, theoretical drawing, equipment editor, table, balance metrics, Three.js, profile SVG/CSV и theoretical drawing SVG используют одну последнюю успешную пару inputs/evaluation и не смешивают ее с более новым store snapshot после derive failure.
- JSON export по-прежнему строится из свежих store/view snapshots и не зависит от последней derived evaluation; post-commit derive/render failure не откатывает canonical import.
- В `main.ts` отсутствуют прямые вызовы `makeProfileSnapshot`, `makeTheoreticalDrawing`, `evaluateEquipmentConstraints` и `calculateEquipmentBalance`; временный `ProjectState` и отдельные `currentSnapshot`/`currentConstraintReport`/`currentBalanceResult`/`currentTheoreticalDrawing` удалены.
- Release gate проходит через Vitest, targeted Playwright, TypeScript/Vite build и encoding check в воспроизводимом Docker workflow.

## План коммитов

- **Коммит 1** (после задач 1-3): `refactor(application): add pure project evaluation`
- **Коммит 2** (после задач 4-6): `refactor(app): consume unified project evaluation`
- **Коммит 3** (после задачи 7): `test: enforce project evaluation boundaries`
- **Коммит 4** (после задачи 8): `docs: document project evaluation pipeline`

## Задачи

### Фаза 1: Чистые контракты и расчетный граф

- [x] **Задача 1: Отделить calculation profile от view flags и закрепить render options.** В `src/modules/geometry/model.ts` ввести `GeometryProfileState` без `showGrid`/`showPoints`, но пока сохранить в нем compatibility aliases `slenderness` и `diameter`; `ProfileState` остается расширением geometry state для persistence v2/view boundary. Перевести calculation signatures и `ProfileSnapshot.state` в `src/modules/geometry/profile.ts` и `src/modules/geometry/sections.ts` на `GeometryProfileState`; `makeProfileSnapshot()` должен явно собрать owned state и не spread-ить полный `ProfileState`, чтобы переданный structural subtype не протащил view flags в runtime snapshot. В `src/application/project/normalize.ts` добавить pure projection canonical profile в geometry state без view argument. В `src/modules/rendering/canvas2d.ts` использовать существующий `RenderOptions` из `src/modules/rendering/model.ts` для grid/points вместо чтения `snapshot.state`, а `main.ts` передавать options из `ProjectViewState`. Сохранить JSON v2 profile fields, mesh compatibility aliases и значения `slenderness = length / height`, `diameter = height`; удаление aliases и изменение `HullMeshSignature` оставить follow-up. Обновить manual snapshot fixtures в geometry, constraints, rendering, UI и persistence consumer tests, не удаляя `showGrid`/`showPoints` из JSON/import/projection fixtures. В `src/modules/rendering/canvas2d.test.ts` добавить lightweight Canvas/Path2D doubles и проверить независимые combinations `showGrid`/`showPoints` без зависимости от snapshot state. Logging: calculation projection и geometry contracts не логируют; Canvas сохраняет только существующие adapter-level DEBUG/WARN события и не пишет полный snapshot или render options. Зависимости: задача является prerequisite для точной сигнатуры `deriveProject(ProjectInputs)` и блокирует задачи 3-6.

- [x] **Задача 2: Удалить logging side effects из transitive calculation closure.** Удалить imports/calls глобального `logger` из `src/modules/geometry/profile.ts`, `src/modules/equipment/model.ts`, `src/modules/equipment/constraints.ts` и `src/modules/balance/equipment-balance.ts`, поскольку эти функции вызываются будущим pure `deriveProject()`. Вместе с logs удалить либо упростить ставшие неиспользуемыми imports, locals, counters и parameters (`firstS`/`lastS`, `requiredRadius`, `checkedPairs`, `geometryMode`, aggregate counts и аналогичные log-only values), чтобы сохранить `noUnusedLocals`/`noUnusedParameters` build gate. Не вводить injected logger, callback hooks, новые validation reason contracts или environment checks в functional core; существующие constraint issues, balance warning codes/messages и discriminators остаются возвращаемыми данными и сохраняют текущую семантику. Adapter-level logging в placement/editor/rendering/persistence не затрагивать, если он не входит в calculation closure. Добавить focused no-console assertions на pure path с spies на `console.info`, `console.warn`, `console.error` и при общей проверке `console.debug`, учитывая, что текущий DEBUG logger пишет через `console.info`. Logging: verbose summary и неожиданные failures позже логируются один раз на app derivation/render boundary; pure leaf calculations не логируют inputs, outputs и warnings. Файлы: перечисленные calculation modules и их `*.test.ts`. Зависимости: может выполняться после/параллельно задаче 1, блокирует утверждение purity в задачах 3 и 7.

- [x] **Задача 3: Ввести `ProjectEvaluation` и реализовать pure `deriveProject()`.** В `src/application/project/model.ts` добавить readonly contract с явными полями `hullGeometry`, `theoreticalDrawing`, `constraints`, `balance`; не включать equipment, view settings, diagnostics UI, persistence DTO или aliases вне geometry snapshot. Создать `src/application/project/derive.ts`: project canonical profile через projection из задачи 1 преобразуется в `ProfileSnapshot`, drawing строится только из этого snapshot, constraints получают тот же snapshot и `inputs.equipment`, balance получает те же equipment и exact `inputs.balanceSettings`. Не выполнять clamp/round повторно, не ловить exceptions и замораживать aggregate root после полного вычисления. Добавить `src/application/project/derive.test.ts` с current/legacy modes, `B != H`, ненулевой ЦВК, inside/outside/intersection/invalid equipment, custom density/gravity, drawing-to-geometry coherence, deterministic repeated result и отсутствием console side effects; явно проверить существующие `balance.buoyancyModel === "equipmentDisplacedVolume"` и `equipmentOnlyBuoyancyModel`, не переименовывая balance/mass/hydrostatics contracts и не дублируя полную unit matrix leaf modules. Logging: `deriveProject()` и tests не импортируют logger и не эмитят logs; все observable diagnostics остаются typed fields результатов. Зависимости: зависит от задач 1-2 и блокирует runtime migration.

<!-- Commit checkpoint: tasks 1-3 -->

### Фаза 2: Runtime и consumers единой evaluation

- [x] **Задача 4: Перевести runtime на тестируемую атомарную публикацию последнего успешного результата.** Создать обязательный browser-free coordinator в `src/app/projectEvaluationRuntime.ts` с injected derive/render hooks и unit tests: canonical update сначала полностью вычисляет `nextEvaluation`, затем одним присваиванием публикует readonly пару `{ inputsSnapshot, evaluation }`, после чего вызывает renderer; view-only rerender использует текущую пару без derivation. Это не store subscriber, reducer, command bus, async queue, history или новый persistence/domain aggregate. В `src/app/main.ts` заменить раздельные mutable `currentSnapshot`, `currentTheoreticalDrawing`, `currentConstraintReport` и `currentBalanceResult` этим runtime owner. Удалить локальные fallbacks, которые превращают unexpected constraints failure в `undefined` report и balance failure в результат пустого проекта. Зафиксировать и протестировать phase table: prepare failure не commit-ит; post-commit controls failure сохраняет commit и не запускает derive; derive failure сохраняет commit и предыдущую пару; render failure сохраняет commit и новую пару. Назначить ровно одного владельца ERROR-log для каждой phase, чтобы derive exception не логировался повторно как `postCommitRender`/`prepare`; caller отвечает только за существующие alert/rethrow semantics. Canonical profile/equipment/balance commits вызывают одну derivation, а grid/points/scene, resize и download paths используют current publication. Logging: DEBUG перед/после успешной derivation с mode/counts/warning counts, один ERROR с корректной phase и error message без полного payload; не возвращать logging внутрь pure modules. Зависимости: зависит от задачи 3; блокирует задачи 5-7.

- [x] **Задача 5: Перевести rendering и export paths на поля одной опубликованной пары.** Обновить orchestration так, чтобы Canvas profile, theoretical drawing Canvas, equipment editor, station table, balance metrics и Three.js получали узкие arguments из `publication.evaluation`, а equipment именно из `publication.inputsSnapshot`, не из более нового `ProjectStore`; это сохраняет coherence geometry/report/balance/equipment после post-commit derive failure. Profile/theoretical SVG/CSV handlers используют ту же publication, тогда как JSON handler продолжает использовать свежие `inputsAndViewToSerializableProject(projectStore.getSnapshot(), projectViewState)` и не читает evaluation. Scene bounds вычислять из `publication.evaluation.hullGeometry`, normalized scene settings оставлять view state. Canvas resize повторно использует publication и текущие view options; `HullScene3d.resize()` сохраняет собственный последний успешно отрендеренный `framedSnapshot`, поэтому resize не вызывает искусственный повторный `scene.render()` или derivation. View/resize/download paths не запускают derive. Не менять renderer/export formulas и не заставлять adapters импортировать весь `ProjectEvaluation`, если им нужен один leaf result. Файлы: прежде всего `src/app/main.ts`; adapter signatures менять только для явного `RenderOptions` из задачи 1, с targeted updates в `src/modules/rendering/canvas2d.ts` и tests. Logging: сохранить существующие render/export boundary events, добавить correlation только через компактные counts/mode, не логировать aggregate publication и не дублировать derivation summary в каждом adapter. Зависимости: зависит от задачи 4.

- [x] **Задача 6: Удалить временный `ProjectState` и очистить composition root.** После перевода всех consumers обязательно удалить imports/type/use `makeProjectState` из `src/app/main.ts` и удалить `src/app/projectState.ts`; добавить gate отсутствия `projectState`/`makeProjectState` во всех `src/**/*.ts`. Equipment для engineering consumers брать из опубликованного inputs snapshot, свежие balance inputs для derivation/JSON — из `ProjectStore`, scene settings — из `ProjectViewState`, derived data — из `ProjectEvaluation`; runtime publication из задачи 4 не должна получить старое имя или стать новым смешанным compatibility/persistence aggregate. Сократить `renderCommittedState` до coordinator invocation и adapter wiring либо переименовать функции по фактической ответственности, не вынося каталог массово и не меняя store/import ownership. Обновить `src/app/dom-contract.test.ts` только для устойчивых ownership/dependency invariants, не заменять behavioral coverage хрупкими assertions полного source text. Logging: удалить `project state assembled`; сохранить один application-level evaluation summary и phase logs из задачи 4. Зависимости: зависит от задач 4-5 и завершает runtime migration.

<!-- Commit checkpoint: tasks 4-6 -->

### Фаза 3: Regression gates, документация и проверка

- [x] **Задача 7: Закрепить integration behavior и dependency/purity gates.** Сохранить direct application-layer gate для всех production files в `src/application/project`, а для purity реализовать в `src/application/project/dependency-contract.test.ts` recursive TypeScript Compiler API traversal value-import graph от `derive.ts`, а не hard-coded список: обход должен включить theoretical drawing, geometry strategies/shared helpers, constraints -> profile/model и equipment-balance -> model/stability. Во всех reachable production files запретить imports из `app`, UI, rendering, persistence, `shared/logger`, `three`/Vite, а также `import.meta.env` и прямые DOM/browser globals/types; type-only imports не должны создавать ложную runtime closure. Через browser-free coordinator из задачи 4, injected spies и `ProjectStore` listener доказать: ноль derivations для grid/points/scene/resize/download, одна derivation для каждого canonical profile/equipment/density commit, один `replaceProject` commit на успешный import, отсутствие rollback и сохранение старой coherent pair при derive failure, сохранение новой pair при render failure, один ERROR правильной phase без double logging. Отдельно сохранить Canvas options, JSON-without-evaluation и pre-commit invalid import regressions; существующие import/E2E tests не считать достаточным покрытием post-commit failures. No-console tests pure path перехватывают фактические `console.info/debug/warn/error`. Targeted browser test добавлять только для observable behavior без pixel-flaky screenshots. Файлы: `src/application/project/derive.test.ts`, dependency gate, `src/app/projectEvaluationRuntime.test.ts`, релевантные app/adapter tests и при необходимости `tests/e2e/import-export.spec.ts`. Зависимости: зависит от задач 1-6.

<!-- Commit checkpoint: task 7 -->

- [ ] **Задача 8: Выполнить docs checkpoint и полный release gate.** Через `/aif-docs` обновить `docs/architecture.md`, `docs/calculations.md`, `docs/testing.md`, `docs/data-and-export.md` и при необходимости `docs/architecture/ui-refactoring-context.md`. Не только добавить target flow, но заменить устаревшие Current Runtime/State и testing sections, которые еще называют DOM/module-level equipment/`ProjectState` владельцами. Зафиксировать фактический поток `ProjectStore -> ProjectInputs -> deriveProject -> ProjectEvaluation -> adapters`, view-neutral geometry snapshot, equipment-only balance semantics и coherence пары inputs/evaluation. Явно различить один атомарный canonical `replaceProject` commit, отдельную атомарную publication после успешного derive и нетранзакционный browser rendering; post-commit failures не откатывают inputs. В data/export docs закрепить, что JSON строится из свежих `ProjectInputs + ProjectViewState` и не содержит evaluation, а engineering SVG/CSV используют последнюю успешную publication. Обновить `AGENTS.md` и `.ai-factory/ARCHITECTURE.md` в соответствии с фактическими файлами; roadmap менять через owner workflow `/aif-roadmap`, отмечая milestone завершенным только если acceptance criteria подтверждают отсутствие direct calculations и временного `ProjectState` в `main.ts`. Не объявлять `SectionShape`, полный ЦВ или JSON v3 реализованными. Запустить targeted Vitest, затем `docker compose run --rm app npm run test`, `docker compose run --rm app npm run build`, `docker compose run --rm app npm run check:encoding` и локальный targeted `npm run test:e2e -- tests/e2e/import-export.spec.ts --project=chromium`; если локальный Chromium недоступен, использовать официальный fallback `docker compose -f compose.e2e.yml run --rm e2e`, и только при недоступности обоих environments фиксировать browser smoke blocker. Logging: production logging после docs checkpoint не менять; verification подтверждает, что verbose logs ограничены adapters/app boundaries и не содержат полного project/evaluation payload. Зависимости: зависит от задачи 7; завершает план только после успешных автоматизированных gates и проверки roadmap/docs consistency.

<!-- Commit checkpoint: task 8 -->

## Риски и контроль

- Удаление `showGrid`/`showPoints` из snapshot может незаметно отключить overlays; отдельный `RenderOptions` и targeted Canvas regression являются обязательными до runtime migration.
- Текущие constraints и balance маскируют неожиданные exceptions безопасно выглядящими результатами. Новый fail-fast derive изменяет только exceptional path; публикация выполняется после полного расчета, а canonical store остается независимым от visual result.
- После post-commit derive failure свежий store и предыдущая publication намеренно расходятся: JSON отражает canonical committed inputs, а engineering render/export продолжает использовать coherent предыдущую пару и не смешивает ее с новым equipment. Пользователь получает phase-specific error по существующей import/runtime semantics.
- `ProjectStore` принимает уже нормализованные inputs и не становится normalization boundary в этом плане. Programmatic invalid input остается нарушением caller contract, а JSON/DOM продолжают использовать существующие normalizers.
- Constraint messages используют equipment names, поэтому name-only edit должен пересчитывать evaluation, даже если geometry и числовые параметры оборудования не изменились.
- `Object.freeze()` aggregate root не делает `ReadonlyMap` runtime immutable. План не вводит новый immutable collections layer; consumers обязаны соблюдать readonly contract, а отдельное усиление runtime ownership возможно follow-up.
- Theoretical drawing сохраняет существующие title/labels. Полная декомпозиция presentation-neutral geometry и локализованных labels не входит в этот инкремент.
- Удаление core logs снижает трассировку внутри формул, но structured issues/warnings остаются в результатах, а application boundary получает один согласованный verbose summary вместо множественных side effects.
