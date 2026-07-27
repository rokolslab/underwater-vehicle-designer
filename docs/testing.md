[← Data and Export](data-and-export.md) · [Back to README](../README.md) · [Docker Workflow →](docker.md)

# Testing

Проект использует Vitest для расчетных модулей, persistence и UI-contract проверок.

## Commands

```bash
npm run check:encoding
npm run test
npm run build
```

Docker equivalents:

```bash
docker compose run --rm app npm run check:encoding
docker compose run --rm app npm run test
docker compose run --rm app npm run build
```

## Test Layout

Тесты лежат рядом с модулями:

| Area | Examples |
| --- | --- |
| `src/modules/geometry/` | `profile.test.ts`, `theoretical-drawing.test.ts` |
| `src/modules/equipment/` | `model.test.ts`, `placement.test.ts`, `constraints.test.ts` |
| `src/modules/balance/` | `equipment-balance.test.ts` |
| `src/modules/rendering/` | `mesh.test.ts`, `scene3d.test.ts`, `equipment3d.test.ts` |
| `src/modules/persistence/` | `csv.test.ts`, `svg.test.ts`, `project-json.test.ts` |
| `src/modules/ui/` | `equipment.test.ts`, `metrics.test.ts` |
| `src/app/` | `appState.test.ts`, `dom-contract.test.ts` |

## Geometry Regression

`profile.test.ts` проверяет:

- `height`/compatibility `diameter` являются полной максимальной высотой;
- current-formula масштабирует эллиптические сечения по независимым `B`/`H`;
- legacy mode передает `B` в `MaxWl`, `H` в `MaxBt`;
- `radiusAt` совпадает с fixture из `tests/fixtures/formula-profile.json`;
- contract станций: `0`, half-step, равномерные станции, `L - halfStep`, `L`;
- ЦВК дает постоянный радиус на вставке;
- `ProfileSnapshot` immutable и содержит 321 smooth point.

## Theoretical Drawing Tests

`theoretical-drawing.test.ts` проверяет:

- данные чертежа используют `ProfileSnapshot` без изменения extents;
- секции строятся из station points;
- `Корпус` делит секции на носовые, кормовые и мидель;
- батоксы и ватерлинии создают внутренние curves;
- waterlines симметричны, buttocks положительные.

## Equipment and Constraint Tests

Проверяются:

- объемы сферы, цилиндра и блока;
- валидация id, name, mass, dimensions, displaced volume;
- создание, update, rename, delete;
- сохранение пробелов в `Наименование`;
- выход за эллиптическое сечение корпуса;
- выход за продольные границы;
- пересечения sphere-sphere;
- консервативная AABB-проверка для остальных форм;
- приоритет статуса `outsideHull` над `intersects`.

## Balance Tests

`equipment-balance.test.ts` проверяет:

| Scenario | Expected |
| --- | --- |
| empty equipment | invalid result + `emptyEquipment` |
| one item | масса, объем, вес, плавучесть, CG, CB |
| two items | CG взвешен по массе, CB по объему |
| no explicit displaced volume | используется геометрический объем |
| invalid equipment | объект пропущен, warning сохранен |
| invalid density/gravity | invalid result |
| negative buoyancy | `nonPositiveBuoyancy` |
| CB below CG | `unstableVerticalCenters` |

## Persistence Tests

Проверяются:

- CSV header and rows;
- SVG path generation;
- JSON schema version;
- JSON normalization for profile, equipment, scene3d and balance settings;
- rejection of invalid JSON/root/schema.

## Coordinate and Migration Regressions

- правый базис Body/SNAME-NED и преобразования `s↔body.x`;
- Body↔Three и знаки XZ/XY/YZ projections;
- три оси цилиндра, стороны clipping и сечения `[-L/2,+L/2]`;
- fixtures JSON v1/v2, marker `SNAME_NED_BODY_CENTER_V1` и предупреждение `old.z=starboard`;
- миграция размеров box и секущих плоскостей;
- `BG`, знаки моментов и equipment-only ограничение ЦВ.

## UI Contract Tests

`dom-contract.test.ts` защищает DOM ids, которые требуются `main.ts`. Если в `index.html` переименовать элемент без изменения `main.ts`, тест должен упасть.

`equipment.test.ts` проверяет HTML editor и чтение updates из строк оборудования.

## Encoding Check

`scripts/check-encoding.mjs` проверяет:

- все текстовые файлы читаются как UTF-8;
- нет типичных mojibake tokens;
- ключевые русские UI-строки существуют в ожидаемых файлах.

Это важно на Windows, где terminal output может выглядеть как mojibake даже при корректном файле.

## Manual Smoke Checklist

Перед демонстрацией UI:

1. Запустить `npm run dev`.
2. Проверить, что `Размерения` раскрываются/скрываются.
3. Изменить `L`, `lambda`, `D` и убедиться, что профиль меняется.
4. Переключить `Сетка` и `Точки обвода` в боковом виде.
5. Проверить 3D modes: `Сплошной`, `Рентген`, `Вырез`.
6. Добавить два объекта и создать пересечение.
7. Проверить русские предупреждения и отсутствие перекрытия кнопок.
8. Ввести наименование из двух слов.
9. Скачать SVG, CSV и JSON.
10. Загрузить JSON обратно.

## When to Add Tests

Добавляйте тест, если меняется:

- формула радиуса или координатная система;
- логика ЦВК;
- формат JSON/CSV/SVG;
- ограничения оборудования;
- баланс или warning codes;
- DOM ids, которые использует `main.ts`;
- нормализация пользовательского ввода.

## See Also

- [Calculations](calculations.md) — что именно должно быть покрыто регрессиями.
- [Architecture](architecture.md) — границы модулей для тестов.
- [Docker Workflow](docker.md) — запуск проверок в контейнере.
