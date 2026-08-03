---
archived: 2026-08-03
---

# План реализации: проверки размещения оборудования внутри корпуса

Branch: feature/equipment-containment-checks
Created: 2026-07-02

## Настройки

- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage

Milestone: "Реализовать проверки ограничений размещения"
Rationale: Эта веха продолжает уже добавленную модель оборудования и должна показать выход объектов за внутренний объем корпуса и пересечения между объектами.

## Цель

Добавить расчетные проверки компоновки оборудования относительно текущего `ProfileSnapshot`: статус каждого объекта, список предупреждений, подсветку проблемных объектов в UI/2D/3D и тесты для типовых случаев выхода за корпус и пересечений.

## Область работ

- Проверять, что оборудование находится внутри тела вращения корпуса с учетом `cylindricalInsertLength`.
- Проверять выход за продольные границы `x = 0..totalLength`.
- Выявлять пересечения объектов минимум через надежный broad phase по AABB и точные/консервативные narrow checks для поддерживаемых shapes.
- Показывать пользователю понятные статусы: `ok`, `outsideHull`, `intersects`.
- Подсвечивать проблемные строки оборудования, 2D-проекцию и 3D-meshes, не блокируя ввод координат.
- Не менять формулу корпуса, `ProfileSnapshot`, SVG/CSV export и расчеты ЦВ/ЦТ в этом инкременте.

## Архитектурные решения

- Новый расчетный модуль разместить в `src/modules/equipment/constraints.ts`; он может зависеть от `geometry` и `equipment`, но не от DOM, canvas или Three.js.
- Проверки использовать общий `ProfileSnapshot` и `profileRadiusAt`, чтобы ЦВК учитывалась так же, как в 2D/3D.
- `src/app/main.ts` вычисляет constraints один раз на `update()` и передает их в UI, 2D renderer и 3D renderer рядом с equipment list.
- UI-статусы остаются в `src/modules/ui/equipment.ts`; расчетные reason-коды и геометрия не должны жить в UI.
- 2D-подсветка остается adapter-слоем в `src/modules/rendering/canvas2d.ts` или выделенном helper рядом с ним; SVG/CSV export не получают equipment overlay.
- 3D-подсветка остается адаптером в `src/modules/rendering/equipment3d.ts` / `scene3d.ts`; renderer получает готовую карту статусов и не пересчитывает constraints.

## Commit Plan

- **Commit 1** (после задач 1-3): `feat(equipment): add containment constraint calculations`
- **Commit 2** (после задач 4-7): `feat(ui): surface equipment constraint warnings`
- **Commit 3** (после задач 8-9): `test: cover equipment containment checks`

## Задачи

### Phase 1: Расчетные constraints

- [x] Task 1: Создать модель результатов проверок в `src/modules/equipment/constraints.ts`.

  Ожидаемое поведение:
  - определить типы `EquipmentConstraintStatus`, `EquipmentConstraintIssue`, `EquipmentConstraintReport`;
  - хранить issues по `equipmentId`, reason-кодам и человекочитаемым сообщениям для UI;
  - поддержать reason-коды `outsideHull`, `outsideLength`, `intersects`, `invalidEquipment`;
  - определить canonical `statusById` contract, чтобы UI, 2D и 3D получали одинаковый итоговый статус;
  - для pair issues хранить `otherEquipmentId`, не смешивая его с обычными one-object issues;
  - задать стабильный порядок severity: `invalidEquipment > outsideLength/outsideHull > intersects > ok`;
  - возвращать immutable/frozen структуры по локальному паттерну проекта;
  - добавить helper для быстрого доступа к итоговому display status объекта по `id`.

  Файлы:
  - `src/modules/equipment/constraints.ts`
  - `src/modules/equipment/constraints.test.ts`

  LOGGING REQUIREMENTS:
  - `DEBUG` при старте и завершении оценки constraints с количеством объектов и issues.
  - `WARN` для invalid equipment item с `id`, `shape`, reason.
  - Не логировать полный список объектов и координат на каждый input event.

- [x] Task 2: Реализовать containment check относительно корпуса.

  Ожидаемое поведение:
  - использовать `ProfileSnapshot` и `profileRadiusAt(x, length, diameter, cylindricalInsertLength)`;
  - проверить продольный диапазон объекта через shape-aware extents;
  - для sphere проверять условие `radialCenter + localRadiusAtX <= hullRadius(x)` на наборе контрольных `x`;
  - для cylinder и box использовать осевые extents и набор surface/control points, чтобы не пропускать очевидный выход за корпус;
  - для transverse-oriented cylinder/box допустима консервативная проверка, которая может дать предупреждение раньше точного CAD-пересечения, но не должна давать ложный `ok` для явно выходящего объекта;
  - учитывать, что координата оборудования `x` задана от носа, а радиальный отступ считается по `sqrt(y^2 + z^2)`;
  - сохранить вычисления чистыми и независимыми от Three.js.

  Файлы:
  - `src/modules/equipment/constraints.ts`
  - `src/modules/equipment/constraints.test.ts`

  LOGGING REQUIREMENTS:
  - `DEBUG` для агрегированной статистики containment: проверено объектов, outside count.
  - `WARN` при объекте вне продольных границ или вне радиуса корпуса с `id`, `shape`, `x`, `requiredRadius`, `hullRadius`.
  - Не логировать каждую контрольную точку в штатном debug-потоке.

- [x] Task 3: Реализовать проверку пересечений между объектами.

  Ожидаемое поведение:
  - добавить shape-aware AABB для sphere, cylinder и box с учетом ориентации `x/y/z`;
  - выполнить broad phase по AABB для всех пар объектов;
  - для sphere-sphere сделать точную проверку расстояния центров;
  - для остальных пар использовать консервативную проверку на базе AABB/support points, четко обозначив ее как conservative in code names/comments;
  - возвращать issue `intersects` для обоих объектов пары с `otherEquipmentId`;
  - не считать объект пересекающимся сам с собой и не дублировать одну пару несколько раз.

  Файлы:
  - `src/modules/equipment/constraints.ts`
  - `src/modules/equipment/constraints.test.ts`

  LOGGING REQUIREMENTS:
  - `DEBUG` с количеством проверенных пар и найденных пересечений.
  - `WARN` для каждой найденной intersecting pair только на уровне пары: `id`, `otherId`, `method`.
  - Не логировать geometry payload целиком.

### Phase 2: Интеграция в app/UI

- [x] Task 4: Интегрировать constraints в `src/app/main.ts`.

  Ожидаемое поведение:
  - в `update()` после создания `currentSnapshot` вычислять `evaluateEquipmentConstraints(currentSnapshot, equipmentItems)`;
  - сделать `update()` единственным местом, где вычисляется constraints report и equipment UI рендерится с этим report;
  - передавать report в `renderEquipmentEditor`, 2D overlay и `hullScene3d.render`;
  - убрать или сузить pre-update вызовы `renderEquipment()` в add/delete/reset/shape-change flow, чтобы строки не показывали устаревшие warning classes;
  - не пересчитывать геометрию корпуса отдельно от `ProfileSnapshot`;
  - reset должен очищать equipment и тем самым очищать warnings;
  - при отсутствии equipment report должен быть валидным пустым состоянием без warning UI.

  Файлы:
  - `src/app/main.ts`
  - возможно `src/app/projectState.ts`, если constraints нужно хранить в app-layer aggregate.

  LOGGING REQUIREMENTS:
  - `DEBUG` в `update()` с `equipmentCount`, `constraintIssueCount`, `invalidEquipmentCount`.
  - `INFO` только при пользовательских add/delete действиях, как сейчас.
  - `ERROR` при неожиданном исключении constraints evaluation с кратким контекстом профиля.

- [x] Task 5: Показать статусы и предупреждения в редакторе оборудования.

  Ожидаемое поведение:
  - расширить `renderEquipmentEditor(container, items, report?)`;
  - добавить компактный статус в каждой `equipment-row`: `OK`, `Вне корпуса`, `Пересечение`, `Ошибка данных`;
  - подсветить строки с issues через CSS classes, не ломая текущую плотную сетку полей;
  - добавить суммарное предупреждение в equipment band, если есть хотя бы один issue;
  - сохранить доступность: статус должен быть текстом, а не только цветом;
  - не смешивать warning UI с таблицей координат станций.

  Файлы:
  - `src/modules/ui/equipment.ts`
  - `src/modules/ui/equipment.test.ts`
  - `src/app/styles.css`
  - возможно `index.html`, если нужен отдельный контейнер summary.

  LOGGING REQUIREMENTS:
  - `DEBUG` при render editor с количеством rows и issue count.
  - `WARN` не нужен в UI-render path, если report уже содержит issue.
  - Не логировать HTML или user-entered names целиком.

- [x] Task 6: Добавить 2D-подсветку оборудования и статусов на canvas.

  Ожидаемое поведение:
  - расширить `renderCanvasProfile` или добавить dedicated helper рядом с `canvas2d.ts`, чтобы рендерить lightweight equipment overlay поверх текущего профиля;
  - использовать тот же constraints report/status map, что и UI/3D, без повторного расчета ограничений в canvas layer;
  - минимум для sphere показать проекцию центра/радиуса в плоскости `x/y` и цвет статуса;
  - для cylinder/box допустимо начать с bounding/projection marker, если точная 2D-проекция усложнит инкремент;
  - не менять SVG/CSV export: overlay нужен только для интерактивного canvas;
  - сохранить текущую сетку, оси и station points читаемыми.

  Файлы:
  - `src/modules/rendering/canvas2d.ts`
  - возможно новый `src/modules/rendering/equipment2d.ts`
  - `src/app/main.ts`
  - возможно `src/app/styles.css`, если нужны CSS-переменные/цвета для легенды.

  LOGGING REQUIREMENTS:
  - `DEBUG` при 2D overlay render с количеством объектов и status summary.
  - `WARN` если overlay получил status для отсутствующего equipment id.
  - Не логировать каждую canvas primitive/control point.

- [x] Task 7: Подсветить проблемное оборудование в 3D.

  Ожидаемое поведение:
  - передавать в `HullScene3d.render` карту статусов или report;
  - валидные объекты оставить текущим синим material;
  - `outsideHull/outsideLength` подсвечивать красным или оранжево-красным;
  - `intersects` подсвечивать янтарным, если у объекта нет более серьезного outside issue;
  - добавить status-to-material strategy в `scene3d.ts` / `equipment3d.ts`: shared materials per status или material factory с понятным ownership;
  - equipment signature должен учитывать status, чтобы материал обновлялся при изменении constraints без перестройки hull mesh;
  - не мутировать один общий `equipmentMaterial` для разных статусов, иначе все объекты перекрасятся одновременно;
  - dispose materials/geometries корректно, без утечек при частом вводе.

  Файлы:
  - `src/modules/rendering/scene3d.ts`
  - `src/modules/rendering/equipment3d.ts`
  - `src/modules/rendering/equipment3d.test.ts`

  LOGGING REQUIREMENTS:
  - `DEBUG` при пересборке equipment meshes с count и status summary.
  - `WARN` если status map содержит id, которого нет в equipment list.
  - `ERROR` при ошибке создания mesh с `id`, `shape`, `status`.

### Phase 3: Проверка, документация и регрессии

- [x] Task 8: Добавить Vitest-регрессии для containment/intersection и status aggregation.

  Ожидаемое поведение:
  - покрыть sphere полностью внутри корпуса;
  - покрыть sphere вне радиуса корпуса;
  - покрыть объект, выходящий за `x < 0` или `x > totalLength`;
  - покрыть x-oriented cylinder внутри и вне корпуса;
  - покрыть box/cylinder transverse conservative warning;
  - покрыть sphere-sphere intersection и non-intersection;
  - покрыть отсутствие дубликатов issues для одной пары;
  - проверить сценарий с ЦВК, где объект внутри цилиндрической вставки валиден;
  - проверить severity priority, чтобы объект с outside и intersection получал deterministic display status.

  Файлы:
  - `src/modules/equipment/constraints.test.ts`
  - при необходимости fixtures/helpers рядом с тестом, без глобальных test fixtures.

  LOGGING REQUIREMENTS:
  - Тесты не должны зависеть от реального `console`.
  - Для тестовых helpers не добавлять production logging.
  - Ошибки assertions должны проверять status/reason, а не тексты логов.

- [x] Task 9: Выполнить проверки и обновить документацию.

  Ожидаемое поведение:
  - выполнить `npm run test`;
  - выполнить `npm run build`;
  - выполнить `npm run check:encoding`;
  - выполнить browser/in-app smoke: добавить несколько объектов, вывести один за корпус, создать пересечение, убедиться в UI/2D/3D-подсветке и отсутствии наложений на desktop/mobile width;
  - обновить `AGENTS.md` и `.ai-factory/DESCRIPTION.md`, если добавлен `constraints.ts` и warning workflow стал частью карты проекта;
  - не отмечать roadmap milestone завершенной до отдельного `$aif-verify`.

  Файлы:
  - `AGENTS.md`
  - `.ai-factory/DESCRIPTION.md`
  - возможно `docs/`, если появится отдельная пользовательская инструкция по компоновке.

  LOGGING REQUIREMENTS:
  - Документационный checkpoint фиксирует, какие файлы обновлены и почему.
  - Smoke-check notes могут ссылаться на observed statuses, но не должны содержать длинные runtime logs.
  - В production code не добавлять временные `console.log`.

## Риски и ограничения

- Точная CAD-коллизия cylinder/box при произвольных ориентациях не входит в этот инкремент; для non-sphere пар использовать консервативные проверки и явно назвать это в коде.
- Проверки должны учитывать ЦВК через `profileRadiusAt`, иначе объекты в цилиндрической вставке могут получить ложные предупреждения.
- Частые input events не должны пересоздавать hull mesh; менять нужно только equipment/status rendering.
- UI не должен жестко блокировать ввод, иначе пользователь не сможет временно пройти через невалидную позицию при редактировании.
- Reason-коды должны быть стабильными, потому что позже их сможет использовать JSON export или QA.

## Команды проверки

```powershell
npm run test
npm run build
npm run check:encoding
```

## Следующий шаг

После ревью плана запускать:

```text
$aif-implement
```
