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
  "schemaVersion": 1,
  "exportedAt": "2026-07-03T00:00:00.000Z",
  "project": {
    "profile": {},
    "equipment": [],
    "scene3dSettings": {},
    "balanceSettings": {}
  }
}
```

`schemaVersion` сейчас равен `1`. Импорт другого `schemaVersion` отклоняется.

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
  "position": { "x": 2.4, "y": 0, "z": 0 },
  "orientation": "x",
  "dimensions": { "width": 0.4, "height": 0.3, "depth": 0.5 },
  "displacedVolume": 0.06
}
```

Supported shapes:

| Shape | Required dimensions |
| --- | --- |
| `sphere` | `radius` |
| `cylinder` | `radius`, `length` |
| `box` | `width`, `height`, `depth` |

`displacedVolume` optional. Если не задан, используется геометрический объем.

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
N;x;y_top;y_bottom
```

Rows:

```text
1;0;0;0
2;0.15;0.33;-0.33
...
```

Разделитель — `;`. CSV соответствует панели `Координаты точек`.

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

- Не менять `schemaVersion` без миграции.
- Новые поля JSON должны иметь fallback при импорте.
- CSV должен оставаться построенным из `stationPoints`.
- SVG не должен пересчитывать геометрию независимо от `ProfileSnapshot`.
- Русские UI-строки должны проходить `npm run check:encoding`.

## See Also

- [Calculations](calculations.md) — источник данных для экспорта.
- [UI/UX Guide](ui-ux.md) — где находятся export buttons.
- [Testing](testing.md) — тесты persistence-модулей.
