---
archived: 2026-07-11
---

# План реализации: миграция на связанную систему координат SNAME/NED

Branch: feature/sname-ned-coordinate-migration
Created: 2026-07-11

## Настройки

- Testing: yes
- Logging: verbose
- Docs: yes
- Implementation: запрещена до отдельного запуска `$aif-implement`

## Roadmap Linkage

Milestone: "none"
Rationale: существующая веха баланса уже закрыта, а эта миграция является отдельным архитектурным изменением и не должна задним числом менять её статус.

## Цель и границы

Перевести инженерные данные проекта на единую правую связанную систему координат SNAME/NED:

- `+X` — к носу;
- `+Y` — на правый борт;
- `+Z` — вниз;
- положительное вращение вокруг `X` — крен по правилу правой руки;
- положительное вращение вокруг `Y` — дифферент по правилу правой руки;
- положительное вращение вокруг `Z` — рыскание по правилу правой руки.

Инженерное начало координат фиксируется в геометрическом центре корпуса:

- кормовая точка: `x = -L/2`;
- носовая точка: `x = +L/2`;
- диаметральная плоскость: `y = 0`;
- основная горизонтальная ось: `z = 0`.

Миграция меняет координатную архитектуру, но не заменяет текущую упрощённую физическую модель плавучести полноценной гидростатикой корпуса. Текущий расчёт ЦВ по объёмам оборудования должен быть явно помечен как ограничение; отдельный переход к ЦВ внешнего герметичного объёма корпуса планируется отдельно.

## Зафиксированные решения без неоднозначностей

### 1. Четыре независимых пространства координат

1. `Body/SNAME-NED` — единственная инженерная система для оборудования, ЦТ, ЦВ, плеч, сил, моментов, сечений и JSON v2.
2. `Profile` — параметрическая координата `s ∈ [0,L]`, где `s=0` соответствует носу, `s=L` — корме; она используется только для формулы радиуса, станций и регрессии `formula.xlsx`.
3. `Three.js` — техническая `Y-up` система визуализатора, доступная только через адаптер.
4. `Canvas/SVG` — экранные координаты конкретной проекции, доступные только через projection adapters.

Ни один rendering/persistence/UI-модуль не должен самостоятельно переопределять направление инженерных осей.

### 2. Profile ↔ Body

```text
body.x = L/2 - s
s      = L/2 - body.x
```

Радиус профиля не является координатой `body.y` или `body.z`. Конкретная проекция выбирает знак и ось явно.

### 3. JSON v1 / old ↔ Body v2

Для одноразовой миграции старых проектов принимается политика: `old.z > 0` означает правый борт. Это невозможно доказать по старому коду: документация называла старую систему правой, но при `old.x` к корме и `old.y` вверх математически это подразумевало бы противоположный знак `old.z`. Поэтому импорт v1 обязан предупреждать пользователя о принятом соглашении и рекомендовать проверить борт размещения.

```text
body.x = L/2 - old.x
body.y = old.z
body.z = -old.y
```

Обратное преобразование используется только в тестах/диагностике, но не для экспорта новых проектов:

```text
old.x = L/2 - body.x
old.y = -body.z
old.z = body.y
```

Преобразование old→body имеет `det = -1`, поэтому его нельзя применять к углам Эйлера как матрицу вращения. Текущий enum ненаправленной оси цилиндра мигрирует отдельной таблицей:

```text
old x → body x
old y → body z
old z → body y
```

### 4. Размеры оборудования

Для `box` осевые размеры должны получить явные инженерные имена вместо неустойчивого контракта `width/height/depth`:

```text
v1 old.width  (old X) → v2 lengthX
v1 old.depth  (old Z) → v2 breadthY
v1 old.height (old Y) → v2 heightZ
```

Это сохраняет физическую форму некубического блока. `sphere` не меняется. Для `cylinder` сохраняются `radius/length`, меняется только enum оси. Поле `orientation` у sphere/box остаётся нормализуемым для совместимости текущей discriminated union, но не влияет на их геометрию; его последующее удаление — отдельный рефакторинг.

### 5. Body ↔ Three.js

Целевой адаптер является правым поворотом (`det = +1`) и сохраняет Three.js `Y-up`:

```text
three.x =  body.x
three.y = -body.z
three.z =  body.y

body.x  =  three.x
body.y  =  three.z
body.z  = -three.y
```

Композиция v1→body→Three.js:

```text
three.x = L/2 - old.x
three.y = old.y
three.z = old.z
```

Сейчас Three.js использует `three.x = old.x - L/2`; поэтому продольная ось сцены осознанно разворачивается, и нос после миграции находится на `+Three.X`. Корпус и оборудование должны перейти на новый адаптер атомарно.

Ориентации цилиндра в Three.js, исходная ось `CylinderGeometry` — `Three.Y`:

- body `X` → Three `X`: поворот вокруг Three `Z` на `±π/2`;
- body `Y` → Three `Z`: поворот вокруг Three `X` на `±π/2`;
- body `Z` → Three `−Y`: identity, поскольку ось цилиндра ненаправленная.

### 6. Проекции Canvas/SVG

- Боковой вид `XZ`: экран вправо — `+X` (нос справа), экран вниз — `+Z`.
- Вид сверху `XY`: экран вправо — `+X`, экран вниз — `+Y` (правый борт снизу); это соглашение подписывается на листе.
- Корпус/шпангоут `YZ`: экран вправо — `+Y`, экран вниз — `+Z`.

Общие projection adapters должны использоваться Canvas и SVG, чтобы они не расходились по знакам.

### 7. Сечения 3D и миграция настроек

`Scene3dSection` v2 хранит инженерные координаты:

- `crossSectionX.x ∈ [-L/2,+L/2]`;
- `plane: "xy"` означает `body.z = offset`;
- `plane: "xz"` означает `body.y = offset`.

Миграция v1:

```text
old crossSectionX.x → L/2 - old.x
old plane "xy" (old.z=offset) → body plane "xz", offset unchanged
old plane "xz" (old.y=offset) → body plane "xy", offset = -old.offset
```

Для clipping дополнительно тестируется, какая половина корпуса сохраняется при каждом знаке offset; одной проверки совпадения плоскости недостаточно.

### 8. Баланс и моменты в NED

```text
delta   = CB - CG
deltaX  = CB.x - CG.x
deltaY  = CB.y - CG.y
BG      = CG.z - CB.z
stable  = CB.z < CG.z  ⇔  BG > 0
warning = CB.z >= CG.z
```

Силы для горизонтального аппарата в body/NED:

```text
Weight   = (0, 0, +W)
Buoyancy = (0, 0, -B)
```

Общий момент относительно выбранного начала `O`:

```text
M = (CG - O) × Weight + (CB - O) × Buoyancy
```

Для нейтральной плавучести `W=B=F` в горизонтальном положении:

```text
Mx = -F * deltaY   // крен
My = +F * deltaX   // дифферент
Mz = 0             // гидростатического момента рыскания нет
```

Для малых углов при `BG>0`:

```text
Mx ≈ -B * BG * roll
My ≈ -B * BG * pitch
```

Знаки закрепляются basis-тестами правой системы, а не строковыми описаниями.

## Затрагиваемые файлы и модули

### Новые модули

- `src/shared/body-coordinates.ts` — `BodyPoint3`, `BodyVector3`, `profileS↔bodyX`, операции разности/cross product без browser API.
- `src/modules/rendering/coordinate-adapter.ts` — `body↔Three`, adapters `XZ/XY/YZ → screen`.
- `src/modules/balance/stability.ts` — `deltaX`, `deltaY`, `BG`, устойчивость и моменты.
- `src/modules/persistence/project-json-migrations.ts` — чистая миграция v1→v2.

### Изменяемые расчётные и модельные файлы

- `src/modules/geometry/model.ts`
- `src/modules/geometry/profile.ts`
- `src/modules/geometry/theoretical-drawing.ts`
- `src/modules/balance/model.ts`
- `src/modules/balance/equipment-balance.ts`
- `src/modules/balance/center-of-buoyancy.ts` — deprecated-модуль либо переводится через `s→body.x`, либо удаляется отдельным явно согласованным шагом; молча оставлять старые координаты нельзя.
- `src/modules/equipment/model.ts`
- `src/modules/equipment/placement.ts`
- `src/modules/equipment/constraints.ts`

### Rendering/UI/persistence

- `src/modules/rendering/mesh.ts`
- `src/modules/rendering/equipment3d.ts`
- `src/modules/rendering/scene3d.ts`
- `src/modules/rendering/model.ts`
- `src/modules/rendering/viewSettings.ts`
- `src/modules/rendering/canvas2d.ts`
- `src/modules/rendering/theoretical-drawing.ts`
- `src/modules/persistence/project-json.ts`
- `src/modules/persistence/csv.ts`
- `src/modules/persistence/svg.ts`
- `src/modules/persistence/theoretical-drawing-svg.ts`
- `src/modules/ui/equipment.ts`
- `src/modules/ui/metrics.ts`
- `src/modules/ui/table.ts`
- `src/modules/ui/scene3dControls.ts`
- `src/app/projectState.ts`
- `src/app/main.ts`
- `index.html`
- `src/app/styles.css`

### Тесты, fixtures и документация

- co-located `*.test.ts` перечисленных модулей;
- новый `tests/fixtures/project-v1-coordinate-migration.json`;
- новый `tests/fixtures/project-v2-sname-ned.json`;
- `tests/fixtures/formula-profile.json` — сохранить численные значения `formula.xlsx`, но переименовать семантику `x→s`;
- `README.md`, `docs/calculations.md`, `docs/ui-ux.md`, `docs/architecture.md`, `docs/data-and-export.md`, `docs/testing.md`, `docs/getting-started.md`, `TECHNICAL_SPEC.md`, `.ai-factory/DESCRIPTION.md`, `AGENTS.md`.

## Commit Plan

- **Commit 1** (после задач 1–3): `refactor(coordinates): establish sname ned domain model`
- **Commit 2** (после задач 4–6): `refactor(rendering): adapt body coordinates to three js`
- **Commit 3** (после задач 7–9): `feat(persistence): migrate project schema to sname ned v2`
- **Commit 4** (после задач 10–12): `docs(coordinates): document and verify sname ned migration`

## Задачи

### Фаза 1. Координатный контракт и параметрическая геометрия

- [x] **Task 1: Ввести типы и чистые преобразования Body/Profile.** Создать `src/shared/body-coordinates.ts`; заменить дублирующиеся предметные `Vector3` в `equipment/model.ts` и `balance/model.ts` на семантические body-типы; добавить `bodyXFromProfileS`, `profileSFromBodyX`, `oldV1PointToBody`, векторное произведение и тесты базисных векторов/границ. Не допускать зависимости shared/domain от Three.js, DOM, Canvas или persistence schema. **Зависимости:** нет. **Logging:** чистые математические функции не логируют штатные вызовы; вызывающие boundary-модули логируют DEBUG с именем source/target frame, WARN при невалидной длине, без вывода полного проекта.

- [x] **Task 2: Отделить `s/radius` от инженерных `x/y/z` в геометрии профиля.** В `geometry/model.ts`, `profile.ts`, `theoretical-drawing.ts` переименовать `SmoothPoint.x/y` и `StationPoint.x/yTop/yBottom` в явные параметрические сущности; сохранить формулу и порядок выборок `s=0..L`; считать `body.x` только через adapter. Обновить `profile.test.ts`, `theoretical-drawing.test.ts`, `tests/fixtures/formula-profile.json` без изменения эталонных радиусов из `formula.xlsx`. **Зависимости:** Task 1. **Logging:** DEBUG при построении snapshot должен отдельно указывать диапазон `s` и body-X extents; WARN только при нормализации невалидных входов.

- [x] **Task 3: Перевести модель оборудования и constraints на Body/SNAME-NED.** В `equipment/model.ts`, `placement.ts`, `constraints.ts` закрепить позиции в body frame, осевые размеры `box` как `lengthX/breadthY/heightZ`, диапазон корпуса `[-L/2,+L/2]`, а lookup радиуса выполнять через `s=L/2-x`. Сохранить радиальную проверку `hypot(y,z)` и AABB/sphere-инварианты; обновить default position на `(0,0,0)`. Добавить тесты носа/кормы, правого/левого борта, верхней/нижней точки, некубического box и цилиндров по X/Y/Z. **Зависимости:** Tasks 1–2. **Logging:** DEBUG для body bounds/control samples, WARN для outside length/radius с явными `bodyX/bodyY/bodyZ` и `stationS`, ERROR не использовать для ожидаемых constraint issues.

### Фаза 2. Баланс и Three.js

- [x] **Task 4: Исправить баланс и добавить чистый расчёт устойчивости/моментов.** В `balance/equipment-balance.ts`, `balance/model.ts` и новом `balance/stability.ts` заменить ошибочную проверку вертикали на `CB.z >= CG.z`, вычислять `deltaX`, `deltaY`, `BG`, общий момент через cross product и малые восстанавливающие моменты с закреплёнными знаками roll/pitch. Явно сохранить предупреждение, что текущий CB остаётся equipment-volume-weighted и не равен ЦВ внешнего герметичного корпуса. Переписать тест, который сейчас ошибочно считает старый `z` вертикалью, и добавить neutral/non-neutral moment tests. **Зависимости:** Tasks 1 и 3. **Logging:** DEBUG для агрегатов/дельт/моментов и выбранного origin, WARN для `BG<=0`, ненулевых `deltaX/deltaY` сверх заданного допуска и неположительной плавучести; численные допуски должны быть частью настроек/результата, а не скрыты в UI.

- [x] **Task 5: Ввести единый Body↔Three adapter и перевести mesh/equipment.** Создать `rendering/coordinate-adapter.ts`; в `mesh.ts`, `equipment3d.ts`, `scene3d.ts` удалить прямые перестановки/центрирование осей, строить профиль через `s→body→Three`, позиции и оси оборудования — через adapter. Сохранить UV по монотонному `s`, хотя Three.X теперь убывает при росте `s`. Добавить axis helper с подписями `X — нос`, `Y — правый борт`, `Z — вниз`; не отдавать `THREE.Vector3` в domain. **Зависимости:** Tasks 1–3. **Logging:** DEBUG при создании mesh/transform с frame names и axis mapping, INFO один раз при инициализации схемы осей, ERROR при невозможном shape/axis; не логировать каждый vertex.

- [x] **Task 6: Перевести 3D-сечения и управление видом на инженерную семантику.** В `rendering/model.ts`, `viewSettings.ts`, `scene3d.ts`, `ui/scene3dControls.ts` заменить `[0,L]` на `[-L/2,+L/2]`, преобразовать body planes в Three planes через adapter, явно закрепить сохраняемую сторону clipping и подписи body `XY/XZ`. Обновить camera/visual smoke так, чтобы нос был на `+X`, верх `−Z` отображался вверх, правый борт `+Y` соответствовал Three `+Z`. **Зависимости:** Task 5. **Logging:** DEBUG для normalized body section и итоговой Three plane, WARN при clamp с исходным и нормализованным значением, DEBUG после world transform без покадрового спама.

### Фаза 3. Проекции, экспорт и JSON v2

- [x] **Task 7: Перевести Canvas и таблицу станций на явные проекции.** В `rendering/canvas2d.ts`, `ui/table.ts`, `index.html` и стилях использовать XZ projection adapter: нос справа, `+Z` вниз; equipment overlay берёт `position.x/z`, а не `x/y`. Таблицу профиля назвать параметрической (`s`, верхний/нижний радиус), не инженерной XYZ. Добавить pure projection tests, включая знаки всех осей и совпадение габаритов оборудования. **Зависимости:** Tasks 1–3. **Logging:** DEBUG один раз на построение scale/projection с frame и extents, WARN при статусах отсутствующего equipment; не логировать каждую Canvas point.

- [x] **Task 8: Привести теоретический чертёж, SVG и CSV к разделённым контрактам.** В `geometry/theoretical-drawing.ts`, обоих rendering/persistence theoretical drawing adapters, `svg.ts` и `csv.ts` хранить исходные кривые в `s/radius`, но выводить проекции через общие XZ/XY/YZ adapters. Зафиксировать нос справа, правый борт и `+Z` вниз. CSV оставить параметрическим и переименовать заголовки в `N;s;radius_top;radius_bottom`; при необходимости инженерный CSV сделать отдельным явно названным экспортом, не смешивая контракты. **Зависимости:** Tasks 2 и 7. **Logging:** DEBUG для вида экспорта, projection frame, диапазонов и числа строк/кривых; WARN для пустой/невалидной геометрии; SVG/CSV не пересчитывают профиль.

- [x] **Task 9: Ввести JSON schema v2 и однократную миграцию v1.** В `persistence/project-json.ts` и новом `project-json-migrations.ts` повысить `schemaVersion` до `2`, добавить обязательный marker `coordinateSystem: "SNAME_NED_BODY_CENTER_V1"`, экспортировать только v2. Import dispatch выполнять строго по версии: v1 → normalize profile length → pure migration equipment positions/axes/box dimensions/scene sections → canonical v2 normalization; v2 → normalization без миграции; missing/unknown/future version или неверный marker → reject. Вернуть `migratedFromVersion` и понятное предупреждение о политике `old.z=starboard`. Добавить fixtures и тесты known points, трёх осей цилиндра, некубического box, обоих planes, v2 round-trip, повторного save/import без двойной миграции. **Зависимости:** Tasks 1, 3 и 6. **Logging:** INFO один раз на успешную schema migration с версиями, WARN на migration assumptions/normalization, ERROR только для неожиданного исключения; не записывать содержимое пользовательского JSON.

### Фаза 4. UI, документация и комплексная проверка

- [x] **Task 10: Обновить UI инженерных координат и уведомление миграции.** В `ui/equipment.ts`, `ui/metrics.ts`, `app/main.ts`, `index.html`, styles добавить постоянную памятку `X — нос; Y — правый борт; Z — вниз`, направления/единицы в labels/tooltips, корректные поля ЦТ/ЦВ/`deltaX`/`deltaY`/`BG`, body-сечения и видимую пользователю информацию об импорте v1. После миграции UI должен предложить проверить правый/левый борт, но не блокировать успешно нормализованный проект. **Зависимости:** Tasks 3–4, 6 и 9. **Logging:** INFO для import/export success и migration notice, WARN для user-facing validation/migration assumptions, ERROR для FileReader/unexpected apply failure; не дублировать одно предупреждение на каждую строку оборудования.

- [x] **Task 11: Обновить всю документацию и карту проекта.** Через обязательный docs checkpoint `$aif-docs` обновить `README.md`, `docs/calculations.md`, `docs/ui-ux.md`, `docs/architecture.md`, `docs/data-and-export.md`, `docs/testing.md`, `docs/getting-started.md`, `TECHNICAL_SPEC.md`, `.ai-factory/DESCRIPTION.md`, `AGENTS.md`. Удалить утверждения `x: нос→корма`, `y: вверх`, `z: поперёк`; документировать четыре coordinate spaces, начало, положительные направления, формулы миграции, JSON v2 marker, projections и физическое ограничение текущего equipment-only CB. **Зависимости:** решения Tasks 1–10 должны быть стабильны. **Logging:** кодовое логирование не требуется; docs checkpoint фиксирует проверенные команды и проверку UTF-8, без создания отдельного отчётного файла.

- [x] **Task 12: Выполнить комплексную регрессию и визуальную приёмку.** Запустить `npm run test`, `npm run build`, `npm run check:encoding`; отдельно проверить round-trip body→Three→body, v1/v2 JSON, формулу `formula.xlsx`, Canvas/SVG/CSV, constraints и balance signs. Выполнить browser smoke Three.js с axis helper, носом/кормой, правым/левым бортом, верхом/низом, cylinder X/Y/Z, clipping planes и совпадением equipment с hull после drag rotation. **Зависимости:** Tasks 1–11. **Logging:** DEBUG-логи должны позволять проследить frame adapters и migration dispatch; тесты проверяют отсутствие повторяющихся WARN и отсутствие ERROR в штатных сценариях; результаты сообщаются в финальном ответе без добавления report-файла.

## Зависимости этапов

```text
Task 1 ─┬─> Task 2 ─┬─> Task 3 ─┬─> Task 4
        │           │           ├─> Task 5 ─> Task 6 ─┐
        │           └───────────┴─> Task 7 ─> Task 8 │
        └───────────────────────────────> Task 9 <────┘
                                                │
                            Tasks 3,4,6,9 ─> Task 10
                            Tasks 1–10 ─────> Task 11
                            Tasks 1–11 ─────> Task 12
```

## Матрица обязательных тестов

| Область | Обязательные случаи |
| --- | --- |
| Profile/Body | `s=0→x=+L/2`, `s=L→x=-L/2`, обратное преобразование, unchanged radii fixture |
| Old v1/Body | нос, корма, `old.y>0→z<0`, `old.z>0→y>0`, обратная формула только в тесте |
| Body/Three | три базисных вектора, right-handed cross products, round-trip, `det=+1` |
| Оборудование | sphere, non-cubic box, cylinder X/Y/Z, шесть направлений позиции |
| Constraints | signed X bounds, radius lookup через `s`, right/left, top/bottom, AABB и sphere intersections |
| Balance | weighted CG/CB, `CB.z<CG.z`, `BG>0`, warning на equality/below, знаки `Mx/My`, non-neutral origin moment |
| Sections | X min/max, XY/XZ offsets, v1 plane migration, сохраняемая clipping half-space |
| Canvas/SVG | нос справа, `+Z` вниз, `+Y` на выбранной стороне, одинаковые adapters |
| CSV/table | параметрические `s/radius`, отсутствие ложных инженерных `x/y` headers |
| JSON | v1→v2, exact marker, unknown reject, v2 idempotence, no double migration, visible warning |
| Three smoke | axes labels, hull/equipment alignment, camera/drag, cylinder axes, clipping |

## Риски обратной совместимости и меры

1. **Старый знак поперечной оси не восстанавливается.** Мера: единая политика `old.z=starboard`, schema-based migration, visible warning, документированная ручная проверка борта.
2. **Продольная ось Three.js визуально развернётся.** Мера: атомарный перевод hull/equipment/clipping, axis helper и smoke test nose `+X`.
3. **Некубические box могут поменять форму при простой перестановке осей.** Мера: явная миграция `width/depth/height → lengthX/breadthY/heightZ` и fixture с тремя разными размерами.
4. **Сохранённые сечения содержат старые координаты.** Мера: мигрировать `crossSectionX`, plane enum и offset вместе с equipment.
5. **Повторная миграция испортит координаты.** Мера: единственный dispatch по `schemaVersion`, обязательный v2 marker, экспорт только v2, idempotence test.
6. **Параметр профиля снова смешается с body X.** Мера: типы/имена `s/radius`, единственные converters, CSV/table contract и regression tests.
7. **Исправление осей может создать ложное впечатление физически полного баланса.** Мера: сохранить явное предупреждение об equipment-only CB и не включать новую гидростатическую модель корпуса в эту миграцию.
8. **Углы/моменты могут получить неверный знак.** Мера: right-handed basis tests и формула cross product; не преобразовывать Euler angles матрицей v1→body с `det=-1`.

## Критерии приёмки

- Во всех инженерных данных и JSON v2 используется только Body/SNAME-NED с центром корпуса в `(0,0,0)`.
- `s∈[0,L]` отделена от `body.x∈[-L/2,+L/2]` типами, именами и тестами.
- Формула v1 migration реализована ровно один раз на persistence boundary и сопровождается видимым предупреждением о `old.z=starboard`.
- JSON v2 имеет `schemaVersion: 2` и `coordinateSystem: "SNAME_NED_BODY_CENTER_V1"`; v2 не проходит через v1 migration.
- Позиции, цилиндрические оси, некубические box и сохранённые 3D-сечения физически сохраняются после импорта v1.
- Three.js получает данные только через `body↔Three`; нос находится на `+Three.X`, верх на `+Three.Y`, правый борт на `+Three.Z`.
- Canvas/SVG используют общие projection adapters; боковой вид имеет нос справа и `+Z` вниз.
- Constraints работают в signed body X и корректно проверяют все шесть направлений.
- Проверка устойчивости использует `CB.z < CG.z`, `BG=CG.z-CB.z`; моменты крена/дифферента имеют закреплённые тестами знаки.
- CSV и таблица станций явно используют `s/radius`, а не маскируют параметрическую координату под body X.
- UI и 3D-сцена постоянно показывают соглашение `X — нос; Y — правый борт; Z — вниз`.
- README, calculations, UI/UX, architecture, data/export, testing, getting started, technical specification, DESCRIPTION и AGENTS не содержат старой осевой семантики.
- `npm run test`, `npm run build`, `npm run check:encoding` и визуальный Three.js smoke проходят без штатных ERROR.

## Gate перед реализацией

Не начинать `$aif-implement`, пока ревью плана не подтвердит все четыре решения:

1. начало Body frame — геометрический центр корпуса;
2. политика v1 `old.z>0 = правый борт` принята как миграционное допущение;
3. profile `s` остаётся от носа к корме и не является body X;
4. body→Three фиксируется как `(x,-z,y)`, с осознанным разворотом текущей продольной сцены.
