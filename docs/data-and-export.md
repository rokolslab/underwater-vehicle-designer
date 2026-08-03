[← Architecture](architecture.md) · [Back to README](../README.md) · [Testing →](testing.md)

# Data and Export

Документ описывает проектные данные и форматы экспорта: JSON, CSV и SVG.

## Data Ownership

| Data | Owner |
| --- | --- |
| Параметры корпуса и `geometryMode` | `ProfileState` через `appState.ts` |
| Оборудование | `EquipmentItem[]` через `equipment/placement.ts` |
| Настройки 3D | `Scene3dSettings` через `viewSettings.ts` |
| Настройки баланса | `BalanceSettings` |
| Точки профиля | `ProfileSnapshot` |
| Теоретический чертеж | `TheoreticalDrawing` |

## JSON Project

JSON export строится в `src/modules/persistence/project-json.ts`.

Root document:

```json
{
  "schemaVersion": 2,
  "coordinateSystem": "SNAME_NED_BODY_CENTER_V1",
  "exportedAt": "2026-07-03T00:00:00.000Z",
  "project": {
    "profile": {},
    "equipment": [],
    "scene3dSettings": {},
    "balanceSettings": {}
  }
}
```

Новый экспорт использует `schemaVersion: 2` и обязательный marker `coordinateSystem: "SNAME_NED_BODY_CENTER_V1"`. Поддерживаются импорт v2 и односторонняя миграция v1; остальные версии отклоняются. Добавление `profile.geometryMode`, `profile.breadth` и `profile.height` не меняет версию схемы: поля optional/backward-compatible для старых v2 проектов.

## Profile JSON

```json
{
  "geometryMode": "current-formula",
  "length": 6,
  "slenderness": 3,
  "breadth": 2,
  "height": 2,
  "diameter": 2,
  "cylindricalInsertLength": 0,
  "stations": 20,
  "showGrid": true,
  "showPoints": true
}
```

`slenderness` означает `L / H`. Новый export пишет `breadth`, `height` и compatibility поле `diameter = height`. Старые v2 проекты без `breadth`/`height` импортируются как `B = H = diameter` без warning.

`profile.geometryMode` задает режим геометрии корпуса:

| Value | Meaning |
| --- | --- |
| `current-formula` | Текущая формула проекта, default. |
| `legacy-dsnp-pa` | DSNP_PA regression/traceability mode с эллиптическими сечениями первого slice. |

Контракт совместимости:

- новый экспорт всегда записывает нормализованный `profile.geometryMode`;
- новый экспорт всегда записывает `profile.breadth`, `profile.height` и `profile.diameter = profile.height`;
- старые v2 JSON без `profile.geometryMode` импортируются как `current-formula` без warning;
- старые v2 JSON без `profile.breadth`/`profile.height` импортируются как `B = H = diameter` без warning;
- неподдерживаемое значение импортируется как `current-formula` с warning `project.profile.geometryMode normalized`;
- schema остается `2`, потому что изменение backward-compatible.

Legacy-режим не добавляет в JSON параметры `Priam`/`Kr`; скругленно-прямоугольные сечения остаются follow-up. ЦВК в JSON означает `cylindricalInsertLength`; ЦВ как center of buoyancy хранится только как расчетный результат/термин баланса и не является этим полем.

## Equipment JSON

Общий набор полей:

```json
{
  "id": "equipment-1",
  "name": "Аккумуляторный блок",
  "shape": "box",
  "massKg": 12,
  "position": { "x": 0, "y": 0, "z": 0 },
  "orientation": "x",
  "dimensions": { "lengthX": 0.4, "breadthY": 0.5, "heightZ": 0.3 },
  "displacedVolume": 0.06
}
```

Supported shapes:

| Shape | Required dimensions |
| --- | --- |
| `sphere` | `radius` |
| `cylinder` | `radius`, `length` |
| `box` | `lengthX`, `breadthY`, `heightZ` |

`displacedVolume` optional. Если не задан, используется геометрический объем.

## JSON v1 Migration

Старые проекты преобразуются один раз в Body/SNAME-NED:

```text
body.x = L/2 - old.x
body.y = old.z
body.z = -old.y
```

Поскольку старый код не позволял доказать знак поперечной оси, миграция принимает `old.z > 0` как правый борт и всегда возвращает пользователю предупреждение проверить размещение по бортам. Оси цилиндра: old X→Body X, old Y→Body Z, old Z→Body Y. Размеры box: `old.width→lengthX`, `old.depth→breadthY`, `old.height→heightZ`.

Сечения мигрируют так: old X→`L/2-old.x`; old `xy`→Body `xz` без смены offset; old `xz`→Body `xy` с `offset = -old.offset`. Новые проекты обратно в v1 не экспортируются.

## JSON Import Normalization

Импорт защищает проект от некорректных данных:

| Field | Normalization |
| --- | --- |
| `profile.length` | `>= 0.1` |
| `profile.slenderness` | `>= 0.1` |
| `profile.breadth` | `>= 0.01`; missing -> `height` |
| `profile.height` | `>= 0.01`; missing -> `diameter` или `length / slenderness` |
| `profile.diameter` | compatibility alias на `height` |
| `profile.geometryMode` | missing -> `current-formula`; unsupported -> `current-formula` + warning |
| `profile.cylindricalInsertLength` | `0..length/2` |
| `profile.stations` | `8..80`, округляется |
| `equipment.shape` | неизвестное значение -> `sphere` |
| `equipment.orientation` | неизвестное значение -> `x` |
| `equipment.massKg` | `> 0` |
| dimensions | `> 0` |
| duplicate ids | получают первый свободный collision-safe suffix |
| `balanceSettings.waterDensityKgPerM3` | `> 0`, fallback на default воды |
| `balanceSettings.gravityMPerS2` | `> 0`, fallback на default gravity |

Ошибки JSON syntax, root type, schema version и отсутствие `project` возвращают `ok: false`.

`waterDensityKgPerM3` доступен в UI, а `gravityMPerS2` остается скрытой настройкой проекта: импортированное положительное значение сохраняется через application workflow, экспорт и повторный импорт. Общий reset возвращает gravity к `DEFAULT_GRAVITY_M_PER_S2`.

Уникальность `equipment.id` гарантируется на import normalization boundary и при последующем `addEquipmentItem()`. Уже уникальные ID не переименовываются. При конфликте requested ID считается opaque строкой: если `payload` занят и `payload-3` тоже занят, следующий duplicate `payload` станет `payload-4`; это не обещание одной попытки `-index`, а поиск первого свободного suffix. После нормализованного import → export → import повторный import не должен создавать новые duplicate-ID warnings.

## CSV Export

CSV строится из `ProfileSnapshot.stationPoints`.

Header:

```text
N;s;radius_top;radius_bottom
```

Rows:

```text
1;0;0;0
2;0.15;0.33;-0.33
...
```

Разделитель — `;`. CSV соответствует панели `Параметрические точки профиля`.

Колонки `radius_top` и `radius_bottom` остаются совместимым XZ-представлением по `halfHeightZ`. Полуширина `halfBreadthY` в этот CSV не добавляется, чтобы не менять существующий формат; точная эллиптическая геометрия доступна в `ProfileSnapshot` и 3D mesh.

## SVG Export: Side View

`buildSvg(snapshot)` экспортирует текущий боковой профиль. Он использует тот же `ProfileSnapshot`, что Canvas и таблица.

Экспорт располагается в панели `Боковой вид`, потому что относится к этой проекции.

Для `B != H` это XZ-силуэт по `halfHeightZ`, а не полный набор эллиптических сечений.

## SVG Export: Theoretical Drawing

`buildTheoreticalDrawingSvg(drawing)` экспортирует лист теоретического чертежа:

- профиль `Бок`;
- `Полуширота`;
- `Корпус`;
- сетки, подписи, ватерлинии, батоксы и сечения.

Экспорт располагается в панели `Теоретический чертеж`.

Теоретический чертеж получает `halfBreadthY`/`halfHeightZ` из `ProfileSnapshot`, поэтому отображает эллиптический contract для обоих режимов. В metadata SVG указываются `B` и `H`. 3D export как отдельный файл не реализован; интерактивная Three.js-сцена строит exact elliptical ring mesh из тех же полуосей, не compatibility approximation.

## Downloads

`download.ts` создает временный `Blob` и `<a download>`, затем освобождает object URL. Все download calls проходят через один helper.

| Button | Filename | MIME |
| --- | --- | --- |
| `Скачать SVG` в боковом виде | `underwater-vehicle-profile.svg` | `image/svg+xml;charset=utf-8` |
| `Скачать CSV` | `underwater-vehicle-profile.csv` | `text/csv;charset=utf-8` |
| `Сохранить проект` | `underwater-vehicle-project.json` | `application/json;charset=utf-8` |
| `Скачать SVG` в теоретическом чертеже | `underwater-vehicle-theoretical-drawing.svg` | `image/svg+xml;charset=utf-8` |

## Compatibility Rules

- Не менять `schemaVersion` или `coordinateSystem` без миграции.
- Новые поля JSON должны иметь fallback при импорте.
- `profile.geometryMode` остается optional в JSON v2; missing defaults to `current-formula`, unsupported values normalize with warning.
- `profile.breadth`/`profile.height` остаются optional в JSON v2; missing dimensions fall back through `diameter`, then `length / slenderness`.
- `balanceSettings.waterDensityKgPerM3` и `balanceSettings.gravityMPerS2` входят в JSON v2; gravity не имеет отдельного UI control, но импортированное значение сохраняется до reset.
- `equipment.id` должен оставаться уникальным после import и после добавления нового оборудования; collision suffix выбирается как первый свободный.
- CSV должен оставаться построенным из `stationPoints`.
- SVG не должен пересчитывать геометрию независимо от `ProfileSnapshot`.
- Русские UI-строки должны проходить `npm run check:encoding`.

## See Also

- [Calculations](calculations.md) — источник данных для экспорта.
- [UI/UX Guide](ui-ux.md) — где находятся export buttons.
- [Testing](testing.md) — тесты persistence-модулей.
