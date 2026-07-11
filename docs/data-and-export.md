[← Architecture](architecture.md) · [Back to README](../README.md) · [Testing →](testing.md)

# Data and Export

Документ описывает проектные данные и форматы экспорта: JSON, CSV и SVG.

## Data Ownership

| Data | Owner |
| --- | --- |
| Параметры корпуса | `ProfileState` через `appState.ts` |
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

Новый экспорт использует `schemaVersion: 2` и обязательный marker `coordinateSystem: "SNAME_NED_BODY_CENTER_V1"`. Поддерживаются импорт v2 и односторонняя миграция v1; остальные версии отклоняются.

## Profile JSON

```json
{
  "length": 6,
  "slenderness": 3,
  "diameter": 2,
  "cylindricalInsertLength": 0,
  "stations": 20,
  "showGrid": true,
  "showPoints": true
}
```

При импорте `diameter` восстанавливается как `length / slenderness`, чтобы сохранить текущую связь параметров.

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
| `profile.cylindricalInsertLength` | `0..length/2` |
| `profile.stations` | `8..80`, округляется |
| `equipment.shape` | неизвестное значение -> `sphere` |
| `equipment.orientation` | неизвестное значение -> `x` |
| `equipment.massKg` | `> 0` |
| dimensions | `> 0` |
| duplicate ids | получают suffix `-index` |

Ошибки JSON syntax, root type, schema version и отсутствие `project` возвращают `ok: false`.

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

## SVG Export: Side View

`buildSvg(snapshot)` экспортирует текущий боковой профиль. Он использует тот же `ProfileSnapshot`, что Canvas и таблица.

Экспорт располагается в панели `Боковой вид`, потому что относится к этой проекции.

## SVG Export: Theoretical Drawing

`buildTheoreticalDrawingSvg(drawing)` экспортирует лист теоретического чертежа:

- профиль `Бок`;
- `Полуширота`;
- `Корпус`;
- сетки, подписи, ватерлинии, батоксы и сечения.

Экспорт располагается в панели `Теоретический чертеж`.

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
- CSV должен оставаться построенным из `stationPoints`.
- SVG не должен пересчитывать геометрию независимо от `ProfileSnapshot`.
- Русские UI-строки должны проходить `npm run check:encoding`.

## See Also

- [Calculations](calculations.md) — источник данных для экспорта.
- [UI/UX Guide](ui-ux.md) — где находятся export buttons.
- [Testing](testing.md) — тесты persistence-модулей.
