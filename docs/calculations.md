[← UI/UX Guide](ui-ux.md) · [Back to README](../README.md) · [Architecture →](architecture.md)

# Calculations

Эта страница описывает расчетную часть: режимы геометрии корпуса, станции, ЦВК, теоретический чертеж, ограничения оборудования и баланс.

## Coordinate Spaces

Инженерные данные используют правую связанную систему Body/SNAME-NED с началом в геометрическом центре корпуса:

| Axis | Positive direction |
| --- | --- |
| `X` | к носу |
| `Y` | на правый борт |
| `Z` | вниз |

Корма находится в `x = -L/2`, нос — в `x = +L/2`. Допустимый контур сечения задается эллипсом `halfBreadthY`/`halfHeightZ`; при `B = H` он совпадает с прежним круговым радиусом.

Профиль использует отдельную координату `s` от носа (`0`) к корме (`L`):

```text
body.x = L/2 - s
s      = L/2 - body.x
```

Радиус профиля не является Body Y или Body Z. Canvas/SVG и Three.js получают инженерные данные только через соответствующие adapters.

## Input State

Canonical profile inputs хранятся как `ProjectProfileInputs`; расчетная projection для geometry называется `GeometryProfileState` и не содержит view flags. Persisted/view boundary по-прежнему использует `ProfileState` для JSON v2 compatibility.

`GeometryProfileState` содержит:

| Field | Meaning |
| --- | --- |
| `geometryMode` | Режим геометрии корпуса: `current-formula` или `legacy-dsnp-pa` |
| `length` | Полная длина корпуса `L` |
| `slenderness` | Удлинение `lambda = L / H` |
| `breadth` | Максимальная ширина корпуса `B` по Body Y |
| `height` | Максимальная высота корпуса `H` по Body Z |
| `diameter` | Compatibility alias на `height` для старых consumers/JSON |
| `cylindricalInsertLength` | Длина ЦВК |
| `stations` | Количество расчетных интервалов |
| `showGrid`, `showPoints` | Не входят в расчетное состояние; передаются Canvas как `RenderOptions` |

`appState` и JSON import normalizers нормализуют ввод до commit в `ProjectStore` и последующего `deriveProject()`:

- `length >= 0.1`;
- `slenderness >= 0.1`;
- `breadth >= 0.01`;
- `height >= 0.01`;
- `0 <= cylindricalInsertLength <= length / 2`;
- `8 <= stations <= 80`.

Неизвестный `geometryMode` нормализуется в `current-formula`. ЦВК здесь означает цилиндрическую вставку корпуса; ЦВ означает центр величины и относится к расчетам баланса.

## ProjectEvaluation

`deriveProject(ProjectInputs)` является единым чистым расчетным графом текущего приложения. Он возвращает immutable `ProjectEvaluation`:

| Field | Source |
| --- | --- |
| `hullGeometry` | `makeProfileSnapshot(project.profile)` |
| `theoreticalDrawing` | `makeTheoreticalDrawing(hullGeometry)` |
| `constraints` | `evaluateEquipmentConstraints(hullGeometry, equipment)` |
| `balance` | `calculateEquipmentBalance(equipment, balanceSettings)` |

`ProjectEvaluation` не содержит `ProjectViewState`, DOM controls, renderer instances или persistence DTO. View-only события повторно используют последнюю successful publication.

## Geometry Modes

`ProfileSnapshot.state.geometryMode` задает расчетный режим и передается всем downstream consumers через общий snapshot.

| Mode | Behavior |
| --- | --- |
| `current-formula` | Текущая формула проекта, режим по умолчанию. Один нормированный shape factor масштабирует `B/2` и `H/2`, поэтому при `B != H` сечения эллиптические. |
| `legacy-dsnp-pa` | DSNP_PA regression/traceability mode по материалам `APPAUNIT.PAS`: `B -> MaxWl`, `H -> MaxBt`. Это не доказательство инженерной валидности исторических коэффициентов. |

Оба режима используют пользовательские параметры `L`, `B`, `H` и длину ЦВК. `diameter` сохраняется только как совместимое поле состояния и равен `height`.

Скругленно-прямоугольные сечения `Priam`/`Kr` из исторической системы не входят в текущий slice и оставлены как follow-up до появления эталонных данных.

## Current Formula Mode

Базовая функция радиуса для `current-formula` реализована в `src/modules/geometry/current-formula.ts` и подключается через `src/modules/geometry/profile.ts`.

```text
t = s / L
f(t) = t * (1 - t) * (1 - 0.5 * t)
factor(s) = 2 * C * sqrt(max(0, f(t)))
halfBreadthY(s) = B / 2 * factor(s)
halfHeightZ(s)  = H / 2 * factor(s)
```

Нормирующая константа:

```text
xMaxRatio = 1 - sqrt(3) / 3
fMax = f(xMaxRatio)
C = 1 / (2 * sqrt(fMax))
```

При `B = H` это сохраняет прежнюю круговую регрессию `radius = H / 2 * factor`. Скалярный `radius` остается совместимым XZ-представлением и равен `halfHeightZ`.

## Maximum Radius Position

Положение максимального радиуса:

```text
sMax = L * (1 - sqrt(3) / 3)
```

Для гладкой части корпуса эта точка используется как место вставки ЦВК.

## Legacy DSNP_PA Mode

Legacy evaluator реализован в `src/modules/geometry/legacy-dsnp-pa.ts` как отдельный traceability layer, а не как перенос Turbo Pascal UI или подтверждение инженерной пригодности DSNP_PA.

Нормировка координат:

```text
x  = s / L
lc = Lcyl / L
```

Плато ЦВК в нормализованных координатах:

```text
plateauStart = 0.4 * (1 - lc)
plateauEnd   = 0.4 + 0.6 * lc
```

Внутри плато полуось равна `fullAxis / 2`. Вне плато используется documented regression formula:

```text
profileX = x / (1 - lc)              // носовая ветвь
profileX = (x - lc) / (1 - lc)       // кормовая ветвь
halfAxis = 0.9731 * fullAxis * sqrt(profileX * (1 - profileX) * (1.5 - profileX))
```

Соответствие историческим именам:

| DSNP_PA name | Modern field |
| --- | --- |
| `MaxWl` | `halfBreadthY` |
| `MaxBt` | `halfHeightZ` |

`radius` в legacy snapshot остается compatibility/display scalar и равен `halfHeightZ`. Точная форма сечения задается эллипсом `y^2 / halfBreadthY^2 + z^2 / halfHeightZ^2 <= 1`.

## Cylindrical Insert (ЦВК) in Current Formula

ЦВК — цилиндрическая вставка корпуса: прямой участок с постоянным максимальным сечением. В `current-formula` она строится как участок постоянных полуосей `B/2` и `H/2`; в legacy-режиме используется нормализованное плато, описанное в разделе `Legacy DSNP_PA Mode`.

Алгоритм:

1. Нормализовать `Lcyl` в диапазон `0..L/2`.
2. Вычислить длину исходной гладкой части:

```text
Lsource = L - Lcyl
```

3. Найти начало вставки на исходной гладкой форме:

```text
insertStart = maxRadiusX(Lsource)
insertEnd = insertStart + Lcyl
```

4. Для точек внутри вставки использовать максимальные полуоси в `insertStart`.
5. Для точек после вставки сдвигать исходную координату на `Lcyl` назад.

Итоговая длина профиля остается равной `L`.

## ProfileSnapshot

Все визуализации и экспорт используют общий `ProfileSnapshot`:

| Property | Purpose |
| --- | --- |
| `state` | Нормализованный `GeometryProfileState`, включая `geometryMode`, без `showGrid`/`showPoints` |
| `smoothPoints` | 321 точка гладкой кривой для отрисовки |
| `stationPoints` | Точки таблицы и CSV |
| `extents` | `maxRadius`, `maxHalfBreadthY`, `maxHalfHeightZ`, `maxHeight`, `maxRadiusS`, `totalLength` |

Это предотвращает расхождение между canvas, таблицей, SVG, CSV и 3D.

Скалярные поля `radius`, `topRadius`, `bottomRadius` и `maxRadius` сохраняются для совместимости существующих XZ-представлений. Для точных сечений и 3D использовать `halfBreadthY` и `halfHeightZ`.

## Station Points

`makeStationPoints` строит станции по контракту:

- первая точка: `x = 0`;
- вторая точка: половина шага;
- далее равномерные станции;
- предпоследняя точка: `L - halfStep`;
- последняя точка: `x = L`.

При `stations = 20` получается 23 строки, потому что добавляются две половинные станции и два конца.

В обоих режимах `topRadius`/`bottomRadius` описывают XZ-профиль по `halfHeightZ`; полуширота корпуса берется из `halfBreadthY`.

## Theoretical Drawing

`makeTheoreticalDrawing(snapshot)` строит данные для листа:

| Projection | Data |
| --- | --- |
| `Бок` | `profilePoints` и `profileButtockCurves` |
| `Полуширота` | `halfBreadthPoints` и `halfBreadthWaterlineCurves` |
| `Корпус` | `sections`, разбитые на `forward`, `aft`, `midship` |

Ватерлинии симметричны относительно нуля и строятся от `-maxHalfHeightZ` до `+maxHalfHeightZ`. Батоксы положительные: от `0` до `maxHalfBreadthY`.

Кривые сечений считаются по полуосям snapshot, а не повторным вызовом формулы радиуса:

```text
ratio = offset / sourceAxis
target = targetAxis * sqrt(max(0, 1 - ratio^2))
```

При `B = H` это сводится к прежней формуле `sqrt(radius^2 - offset^2)`. При `B != H` это эллиптическая модель сечения.

## 3D Hull Mesh

`src/modules/rendering/mesh.ts` строит корпус как набор поперечных колец из `ProfileSnapshot.smoothPoints`.

Для каждой точки профиля вершины кольца задаются напрямую из точных полуосей сечения:

```text
y = halfBreadthY * cos(theta)
z = halfHeightZ * sin(theta)
```

3D mesh использует exact elliptical ring mesh из `halfBreadthY`/`halfHeightZ`, а не compatibility approximation телом вращения. Mesh signature включает `geometryMode`, `breadth`, `height`, `maxHalfBreadthY`, `maxHalfHeightZ` и подпись полуосей сечений, поэтому 3D-геометрия пересобирается при смене режима или сечений.

## Equipment Geometry

Поддерживаемые формы:

| Shape | Dimensions | Volume |
| --- | --- | --- |
| `sphere` | `radius` | `(4 / 3) * pi * r^3` |
| `cylinder` | `radius`, `length`, `orientation` | `pi * r^2 * length` |
| `box` | `lengthX`, `breadthY`, `heightZ` | `lengthX * breadthY * heightZ` |

Центр оборудования равен `position`. Явный `displacedVolume` может переопределить геометрический объем; если он не задан, используется геометрический объем.

## Containment Constraints

Проверка выхода за корпус выполняется в `src/modules/equipment/constraints.ts`.

Проверяются два типа ограничений:

| Reason | Condition |
| --- | --- |
| `outsideLength` | `minX < -L/2` или `maxX > +L/2` |
| `outsideHull` | объект выходит за круговое или эллиптическое сечение корпуса в контрольной точке |

Для сферы контрольные `x`:

```text
center.x - r, center.x, center.x + r
```

Для цилиндров и блоков используется несколько контрольных точек по длине extents. Сечение корпуса ищется через `s = L/2 - body.x`.

Требуемый радиус:

```text
requiredRadius = hypot(center.y, center.z) + localRadius
```

Для сферы `localRadius` зависит от среза `dx`. Для цилиндров и блоков в `current-formula` используется консервативная оценка по `hypot(extents.y, extents.z)`.

В `legacy-dsnp-pa` containment проверяет контрольные точки объекта относительно эллипса сечения:

```text
(y / halfBreadthY)^2 + (z / halfHeightZ)^2 <= 1
```

Это делает проверку согласованной с snapshot и 3D mesh, но не является CAD Boolean-проверкой произвольных поверхностей.

## Intersection Constraints

Пересечения проверяются попарно:

1. Для всех объектов строятся AABB extents.
2. Если AABB не пересекаются, пара считается безопасной.
3. Для пары `sphere` + `sphere` дополнительно используется расстояние между центрами.
4. Для остальных пар AABB-пересечение считается консервативным пересечением.

Приоритет статуса:

```text
ok < intersects < outsideHull < invalidEquipment
```

Если у объекта одновременно есть пересечение и выход за корпус, в строке показывается более тяжелый статус.

## Balance Calculation

Баланс считается по оборудованию, а не по объему корпуса. Это важное текущее ограничение модели.

Входы:

| Input | Default |
| --- | --- |
| `waterDensityKgPerM3` | `1025` |
| `gravityMPerS2` | `9.80665` |
| `equipment` | список валидных объектов |

Агрегаты:

```text
totalMass = sum(m_i)
displacedVolume = sum(V_i)
weight = totalMass * g
buoyancyForce = displacedVolume * rho * g
netBuoyancy = buoyancyForce - weight
```

Центр тяжести:

```text
CG = sum(m_i * p_i) / sum(m_i)
```

Центр величины:

```text
CB = sum(V_i * p_i) / sum(V_i)
```

Дельты и вертикальная устойчивость:

```text
delta  = CB - CG
deltaX = CB.x - CG.x
deltaY = CB.y - CG.y
BG     = CG.z - CB.z
stable = BG > 0
```

В Body/NED вес направлен по `+Z`, плавучесть — по `-Z`. Общий момент: `M = (CG - O) × Weight + (CB - O) × Buoyancy`. Для нейтральной плавучести: `Mx = -F * deltaY`, `My = +F * deltaX`, `Mz = 0`. Малые восстанавливающие моменты: `Mx ≈ -B * BG * roll`, `My ≈ -B * BG * pitch`.

## Balance Warnings

| Code | Meaning |
| --- | --- |
| `emptyEquipment` | Нет оборудования для расчета |
| `invalidEquipment` | Некорректный объект пропущен |
| `invalidWaterDensity` | Плотность воды не положительная |
| `invalidGravity` | Ускорение свободного падения некорректно |
| `nonPositiveBuoyancy` | Запас плавучести нулевой или отрицательный |
| `unstableVerticalCenters` | `CB.z >= CG.z`, то есть `BG <= 0` |

## Current Limits

- ЦВ взвешен только по вытесненным объемам оборудования. Это **не ЦВ внешнего герметичного объема корпуса**.
- Масса корпуса, балласт, толщина оболочки и частичное затопление не учитываются.
- `center-of-buoyancy.ts` содержит deprecated current-formula-only расчет по геометрическому корпусу. Он не является реализацией legacy geometry, full hull CB или ЦВК.
- Legacy DSNP_PA режим является regression/traceability mode с эллиптическими сечениями первого slice. Скругленно-прямоугольный `Priam`/`Kr` и инженерная валидация исторических коэффициентов не входят в текущий scope.
- Для не-сферических пересечений используется консервативный AABB подход, не CAD Boolean.
- Произвольные углы поворота оборудования пока не поддерживаются; только оси `x`, `y`, `z`.

## See Also

- [UI/UX Guide](ui-ux.md) — где эти расчеты отображаются в интерфейсе.
- [Architecture](architecture.md) — границы модулей расчетов.
- [Testing](testing.md) — регрессии формулы, ограничений и баланса.
