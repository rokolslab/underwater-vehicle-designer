# План реализации: ширина/высота сечения и формулы геометрии

Branch: feature/elliptical-section-dimensions
Created: 2026-07-27

## Original Request

1. переключатель между текущей формулой и ДСНП есть, но названия нужно изменить. Где-то нужно выводить формулу. Название в переключатете предложи короткое. 2. Для элиптических обводов нет полей для ввода ширины и высоты. 3. для текущей формулы также можно получить элиптические обводы корпуса?

нужен план для внесения этих изменений?

используй full

согласовано, делай

## Цель

Доработать geometry UI и контракт корпуса так, чтобы оба режима геометрии (`current-formula` и `legacy-dsnp-pa`) могли строить эллиптические сечения по отдельным пользовательским размерам `B` и `H`, а интерфейс коротко называл режимы и явно показывал активную формулу.

## Scope

Включено:

- Короткие подписи режимов в переключателе: `Текущая` и `ДСНП_ПА`.
- Отдельное отображение активной формулы/traceability-описания рядом с выбором режима.
- Поля ввода `Ширина B` и `Высота H`.
- Расширение `ProfileState` на `breadth`/`height` с backward-compatible `diameter` alias на `height` на период перехода.
- `current-formula` как эллиптическая версия существующего продольного закона: один normalized shape factor масштабирует `B/2` и `H/2`.
- `legacy-dsnp-pa`: `B` подается в `MaxWl`, `H` подается в `MaxBt`.
- JSON v2 backward compatibility: старые проекты без `breadth`/`height` открываются как `B = H = diameter`.
- Обновление tests и документации.

Не включено:

- Полный отказ от `diameter` во внутренних типах за один инкремент, если это увеличит риск регрессий.
- Скругленно-прямоугольные legacy сечения `Priam`/`Kr`.
- Полный пересмотр CSV/table формата с добавлением новых колонок, если это ломает существующий export contract.
- Новые гидростатические расчеты корпуса или ЦВ внешнего объема.

## Архитектурные решения

1. `height` становится вертикальным размером `H` в Body Z/XZ-профиле.
2. `breadth` становится поперечной шириной `B` в Body Y/полушироте.
3. `diameter` сохраняется как compatibility alias для `height`, чтобы текущие consumers, fixtures и старые JSON не ломались сразу.
4. `slenderness` трактуется как `lambda = L / H`; UI label должен явно говорить `λ = L / H`.
5. Для старого JSON v2 без новых полей: `height = diameter` и `breadth = height`.
6. Для нового JSON v2 export: записывать `breadth`, `height` и `diameter` как compatibility field, где `diameter = height`.
7. `ProfileSnapshot` остается единственным источником геометрии для rendering/export/equipment.
8. `radius`, `topRadius`, `bottomRadius`, `maxRadius` остаются compatibility/display scalar по вертикальной полуоси `halfHeightZ`.
9. UI formula display должен быть derived from normalized `geometryMode`, без дублирования строк в нескольких местах.
10. `ЦВК` продолжает означать цилиндрическую вставку корпуса; `ЦВ` остается center of buoyancy в balance и не используется для ЦВК.

## Риски

- Изменение смысла `diameter` может незаметно затронуть appState, metrics, JSON fixtures и docs; поэтому `diameter` сохраняется как alias на `height`.
- `slenderness = L / H` нужно явно отразить в UI и tests, иначе пользователь будет ожидать связь с шириной `B`.
- Consumers, которые используют `maxRadius`, должны оставаться корректными для XZ-профиля; XY/YZ projections должны использовать `maxHalfBreadthY`/`maxHalfHeightZ`.
- Старые JSON могут иметь `diameter`, но не иметь `height`/`breadth`; missing fields не должны давать warning.
- Current formula fixture по `formula.xlsx` должна остаться прежней при `B = H = diameter`.
- 3D clipping/controls сейчас используют один `maxRadius` для всех продольных сечений; после `B != H` нужны plane-specific bounds: XY offset по `maxHalfHeightZ`, XZ offset по `maxHalfBreadthY`.
- Проверки оборудования сейчас используют эллиптические control points только для `legacy-dsnp-pa`; после эллиптизации текущей формулы containment должен идти по общему elliptical path для обоих режимов.

## Настройки

- Testing: yes
- Logging: standard; использовать существующий `app state normalized` debug, warnings только при real normalization/clamp cases.
- Docs: yes

## Roadmap Linkage

Milestone: `Добавить альтернативную legacy-геометрию обводов`

Rationale: план закрывает следующий практический шаг этой вехи — пользовательские эллиптические размеры `B/H` для текущей и ДСНП_ПА геометрии без перехода к `Priam`/`Kr`.

## Задачи

### Фаза 1: Модель и формулы

- [x] Task 1: Расширить `src/modules/geometry/model.ts` типами/полями `breadth` и `height`, сохранив `diameter` как compatibility alias на `height`. Обновить comments для `radius`/`topRadius`/`bottomRadius`/`maxRadius` как compatibility/display scalar по `halfHeightZ`, а `halfBreadthY`/`halfHeightZ` как точные полуоси. Учесть, что TypeScript strict потребует обновить все manual `ProfileState`/`ProfileSnapshot` builders в тестах и overload compatibility в `src/modules/geometry/sections.ts`. Зависимости: нет. Logging: не требуется.

- [x] Task 2: Обновить `src/modules/geometry/current-formula.ts`: выделить normalized shape factor текущей формулы и добавить current-formula section-extents API для `B/H`, чтобы callers не дублировали factor. Считать `halfBreadthY = B/2 * factor`, `halfHeightZ = H/2 * factor`; при `B = H = diameter` результаты должны совпадать с текущими `formula.xlsx` regressions. Сохранить exact compatibility signatures/exports `radiusAt`, `profileRadiusAt`, `makeProfilePoints`, `makeStationPoints` как circular wrappers/default behavior. Зависит от Task 1. Logging: не требуется.

- [x] Task 3: Обновить `src/modules/geometry/profile.ts` и legacy integration: `sectionExtentsAt` и `makeProfileSnapshot` должны передавать `state.breadth` в legacy `MaxWl`, `state.height`/`diameter` в `MaxBt`, а scalar `radius/topRadius/bottomRadius/maxRadius` должны оставаться вертикальной `halfHeightZ` compatibility view. Зависит от Tasks 1–2. Logging: existing `profile snapshot built` оставить standard и добавить `breadth`/`height` в context только если это уже есть в snapshot summary.

- [x] Task 4: Добавить single source of truth для presentation геометрических режимов: короткий `label` и `formulaText`/traceability text, derived by normalized `GeometryMode`. Разместить рядом с geometry/app-safe contract (`src/modules/geometry/model.ts` или отдельный pure module в `src/modules/geometry/`), чтобы `index.html`/`main.ts`/tests не дублировали строки. Для `current-formula` указать нормированную формулу shape factor и масштабирование `B/H`; для `legacy-dsnp-pa` указать DSNP_PA `MaxWl(B)`/`MaxBt(H)` traceability. Зависит от Tasks 1–3. Logging: не требуется.

### Фаза 2: UI и app state

- [x] Task 5: Обновить `index.html`, `src/app/styles.css` и `src/modules/ui/controls.ts`: переименовать select options в `Текущая` и `ДСНП_ПА`, добавить поле `Ширина B`, заменить visible `Диаметр D` на `Высота H`, добавить отдельный DOM element для активной формулы (например `#geometry-formula`). `diameter` не должен оставаться самостоятельным пользовательским полем; он сохраняется только как compatibility field в state/JSON. UI text должен явно отделять `ЦВК` от `ЦВ`. Зависит от Task 4. Logging: не требуется.

- [x] Task 6: Обновить `src/app/appState.ts` и `src/app/main.ts`: читать/нормализовать `breadth` и `height`, трактовать `slenderness = L / H`, заменить `LastEdited = "slenderness" | "diameter"` на height-based authority, синхронизировать `height` и `slenderness` по `lastEdited`, сохранять `diameter = height`, обновлять active formula line из presentation contract при смене режима и reset/import. `writeProfileControls` должен записывать `breadth`/`height`, а import/reset не должны перетирать parsed `height` через безусловный `update("slenderness")`. Зависит от Task 5. Logging: использовать existing `app state normalized`; warnings только при clamp/normalization.

- [x] Task 7: Добавить/обновить UI/app tests: `src/app/appState.test.ts`, `src/app/dom-contract.test.ts` и при необходимости tests для presentation helper. Покрыть defaults `B=H`, read/reset, invalid/clamp normalization, `slenderness = L/H`, height-authoritative updates, import-preserve-height behavior, короткие labels и formula display DOM contract. Зависит от Task 6. Logging: не требуется.

### Фаза 3: Persistence и downstream consumers

- [x] Task 8: Обновить `src/modules/persistence/project-json.ts`, fixtures и `project-json.test.ts`: JSON v2 остается текущей версией; export пишет `breadth`, `height`, `diameter=height`; import старых v2 без `breadth/height` делает `B=H=diameter` без warning. Явно задать precedence: `height = source.height ?? source.diameter ?? length / slenderness`, `breadth = source.breadth ?? height`, затем `diameter = height` и `slenderness = length / height`; invalid `breadth`/`height` нормализуются с warning. Обновить v1 migration/default expectations и scene3d settings normalization bounds после изменения shape dimensions. Зависит от Tasks 1 и 6. Logging: warnings только при unsupported/normalized values.

- [ ] Task 9: Обновить 3D clipping/settings bounds contract: `src/modules/rendering/viewSettings.ts`, `src/modules/ui/scene3dControls.ts`, `src/app/main.ts`, `src/modules/persistence/project-json.ts` и tests должны принимать section bounds как `{ totalLength, maxHalfBreadthY, maxHalfHeightZ }` или эквивалент. Для `longitudinalPlane` clamp: plane `xy` ограничивается `maxHalfHeightZ`, plane `xz` ограничивается `maxHalfBreadthY`; UI min/max должны меняться при смене plane/mode и импортированных settings. Зависит от Tasks 3, 6 и 8. Logging: сохранить существующие clamp warnings, обновить context names без noisy logs.

- [ ] Task 10: Проверить и минимально обновить remaining consumers, которые еще используют `diameter`/`maxRadius` для bounds/metadata: `src/modules/rendering/canvas2d.ts`, `src/modules/rendering/theoretical-drawing.ts`, `src/modules/persistence/theoretical-drawing-svg.ts`, `src/modules/persistence/svg.ts`, `src/modules/persistence/csv.ts`, `src/modules/ui/table.ts`, `src/modules/rendering/mesh.ts`, `src/modules/equipment/constraints.ts`, `src/modules/geometry/sections.ts`. XZ views могут использовать `height/maxHalfHeightZ`; XY/YZ, theoretical drawing metadata and labels должны использовать relevant axis. `src/modules/equipment/constraints.ts` должен использовать общий elliptical containment path для обоих geometry modes, а не только для `legacy-dsnp-pa`. Теоретический чертеж должен заменить `D=...` на `B=...; H=...` или эквивалентную подпись. Зависит от Tasks 2–9. Logging: без новых noisy logs.

- [ ] Task 11: Добавить/обновить regression coverage для downstream compatibility: current formula circular fixture (`B=H`), current formula elliptical (`B != H`), legacy `MaxWl(B)`/`MaxBt(H)`, sections area, equipment containment for both current and legacy elliptical sections, 3D mesh signature includes `breadth`/`height` or exact section extents, plane-specific clipping bounds, theoretical drawing axes/metadata, JSON round-trip/default/old-v2 fallback, SVG/CSV/table compatibility and manual snapshot builders. Зависит от Task 10. Logging: не требуется.

### Фаза 4: Документация и проверки

- [ ] Task 12: Обновить `docs/calculations.md`, `docs/data-and-export.md`, `README.md` и при необходимости `.ai-factory/DESCRIPTION.md`/`AGENTS.md`: описать `B`, `H`, `lambda = L/H`, formula display, JSON v2 compatibility, plane-specific 3D section bounds и то, что current formula тоже поддерживает эллиптические сечения. Зависит от Tasks 1–11. Logging: не требуется.

- [ ] Task 13: Выполнить финальные проверки `npm run check:encoding`, `npm run test`, `npm run build`. Если локальный `node_modules` снова недоступен, использовать восстановленные зависимости или зафиксировать точный blocker и эквивалентные временные проверки. Зависит от Tasks 1–12. Logging: не требуется.

## Критерии приёмки

- Переключатель режимов показывает короткие labels `Текущая` и `ДСНП_ПА`.
- Активная формула/описание режима видны в UI и меняются при выборе режима.
- Пользователь может задать `Ширина B` и `Высота H`.
- При `B = H` текущая формула численно совпадает с прежними regression fixtures.
- При `B != H` текущая формула строит эллиптические сечения: `halfBreadthY` масштабируется по `B`, `halfHeightZ` по `H`.
- Legacy mode использует `B` для `MaxWl` и `H` для `MaxBt`.
- Старые JSON v2 без `breadth/height` импортируются как `B = H = diameter` без warning.
- Import/export JSON v2 сохраняет `diameter = height` и возвращает согласованные `height`, `breadth`, `diameter`, `slenderness = L/H`.
- 3D longitudinal section offset clamps по релевантной оси: XY по `maxHalfHeightZ`, XZ по `maxHalfBreadthY`.
- Equipment containment корректно проверяет эллиптические сечения в обоих режимах геометрии.
- `ProfileSnapshot` остается источником геометрии для canvas, 3D, theoretical drawing, SVG, CSV, table и equipment constraints.
- `ЦВК` и `ЦВ` не смешиваются в UI/docs/code comments.
- `npm run check:encoding`, `npm run test`, `npm run build` проходят или имеют документированный инфраструктурный blocker.

## Commit Plan

1. После Tasks 1–4: `feat(geometry): support section breadth and height`
2. После Tasks 5–8: `feat(ui): add section dimensions and formula display`
3. После Tasks 9–13: `test(geometry): cover elliptical section dimensions`

## Коммит

Не выполнять commit/push без отдельного разрешения пользователя.
