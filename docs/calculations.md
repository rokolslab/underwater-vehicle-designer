[← UI/UX Guide](ui-ux.md) · [Back to README](../README.md) · [Architecture →](architecture.md)

# Calculations

Эта страница описывает расчетную часть: геометрию корпуса, станции, ЦВК, теоретический чертеж, ограничения оборудования и баланс.

## Coordinate Spaces

Инженерные данные используют правую связанную систему Body/SNAME-NED с началом в геометрическом центре корпуса:

| Axis | Positive direction |
| --- | --- |
| `X` | к носу |
| `Y` | на правый борт |
| `Z` | вниз |

Корма находится в `x = -L/2`, нос — в `x = +L/2`. Допустимый радиус определяется как `hypot(y, z)`.

Профиль использует отдельную координату `s` от носа (`0`) к корме (`L`):

```text
body.x = L/2 - s
s      = L/2 - body.x
```

Радиус профиля не является Body Y или Body Z. Canvas/SVG и Three.js получают инженерные данные только через соответствующие adapters.

## Input State

`ProfileState` содержит:

| Field | Meaning |
| --- | --- |
| `length` | Полная длина корпуса `L` |
| `slenderness` | Удлинение `lambda = L / D` |
| `diameter` | Максимальный физический диаметр `D` |
| `cylindricalInsertLength` | Длина ЦВК |
| `stations` | Количество расчетных интервалов |
| `showGrid`, `showPoints` | UI flags для бокового вида |

`appState` нормализует ввод до передачи в geometry:

- `length >= 0.1`;
- `slenderness >= 0.1`;
- `diameter >= 0.01`;
- `0 <= cylindricalInsertLength <= length / 2`;
- `8 <= stations <= 80`.

## Base Radius Formula

Базовая функция радиуса реализована в `src/modules/geometry/profile.ts`.

```text
t = s / L
f(t) = t * (1 - t) * (1 - 0.5 * t)
r(s) = D * C * sqrt(max(0, f(t)))
```

Нормирующая константа:

```text
xMaxRatio = 1 - sqrt(3) / 3
fMax = f(xMaxRatio)
C = 1 / (2 * sqrt(fMax))
```

Из-за множителя `1 / 2` диаметр `D` является полной максимальной высотой корпуса, а максимальный радиус равен `D / 2`.

## Maximum Radius Position

Положение максимального радиуса:

```text
sMax = L * (1 - sqrt(3) / 3)
```

Для гладкой части корпуса эта точка используется как место вставки ЦВК.

## Cylindrical Insert (ЦВК)

ЦВК — цилиндрическая вставка корпуса: прямой участок с постоянным максимальным радиусом.

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

4. Для точек внутри вставки использовать радиус в `insertStart`.
5. Для точек после вставки сдвигать исходную координату на `Lcyl` назад.

Итоговая длина профиля остается равной `L`.

## ProfileSnapshot

Все визуализации и экспорт используют общий `ProfileSnapshot`:

| Property | Purpose |
| --- | --- |
| `state` | Нормализованный `ProfileState` |
| `smoothPoints` | 321 точка гладкой кривой для отрисовки |
| `stationPoints` | Точки таблицы и CSV |
| `extents` | `maxRadius`, `maxHeight`, `maxX`, `totalLength` |

Это предотвращает расхождение между canvas, таблицей, SVG, CSV и 3D.

## Station Points

`makeStationPoints` строит станции по контракту:

- первая точка: `x = 0`;
- вторая точка: половина шага;
- далее равномерные станции;
- предпоследняя точка: `L - halfStep`;
- последняя точка: `x = L`.

При `stations = 20` получается 23 строки, потому что добавляются две половинные станции и два конца.

## Theoretical Drawing

`makeTheoreticalDrawing(snapshot)` строит данные для листа:

| Projection | Data |
| --- | --- |
| `Бок` | `profilePoints` и `profileButtockCurves` |
| `Полуширота` | `halfBreadthPoints` и `halfBreadthWaterlineCurves` |
| `Корпус` | `sections`, разбитые на `forward`, `aft`, `midship` |

Ватерлинии симметричны относительно нуля и строятся от `-maxRadius` до `+maxRadius`. Батоксы положительные: от `0` до `maxRadius`.

Кривые сечений считаются так:

```text
offsetCurveY = sqrt(max(0, radius(x)^2 - offset^2))
```

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
| `outsideHull` | требуемый радиус объекта больше радиуса корпуса в контрольной точке |

Для сферы контрольные `x`:

```text
center.x - r, center.x, center.x + r
```

Для цилиндров и блоков используется несколько контрольных точек по длине extents. Радиус корпуса ищется через `s = L/2 - body.x`.

Требуемый радиус:

```text
requiredRadius = hypot(center.y, center.z) + localRadius
```

Для сферы `localRadius` зависит от среза `dx`. Для цилиндров и блоков используется консервативная оценка по `hypot(extents.y, extents.z)`.

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
- `center-of-buoyancy.ts` содержит старый расчет по геометрическому корпусу и не является актуальной моделью ЦВК.
- Для не-сферических пересечений используется консервативный AABB подход, не CAD Boolean.
- Произвольные углы поворота оборудования пока не поддерживаются; только оси `x`, `y`, `z`.

## See Also

- [UI/UX Guide](ui-ux.md) — где эти расчеты отображаются в интерфейсе.
- [Architecture](architecture.md) — границы модулей расчетов.
- [Testing](testing.md) — регрессии формулы, ограничений и баланса.
