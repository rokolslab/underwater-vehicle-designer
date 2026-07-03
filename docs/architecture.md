[← Calculations](calculations.md) · [Back to README](../README.md) · [Data and Export →](data-and-export.md)

# Architecture

Проект построен как frontend-only инженерное SPA с модульными вертикальными зонами. Расчетные модули не зависят от DOM, canvas или Three.js.

## Runtime Overview

```text
index.html
  -> src/app/main.ts
    -> appState reads and normalizes controls
    -> geometry creates ProfileSnapshot
    -> equipment evaluates constraints
    -> balance calculates aggregate metrics
    -> rendering updates Canvas and Three.js
    -> persistence exports JSON/CSV/SVG
```

`main.ts` является orchestration layer. Он связывает DOM events, state, pure modules и rendering, но не содержит расчетных формул корпуса.

## Module Boundaries

| Module | Responsibility | Must Not Do |
| --- | --- | --- |
| `src/app/` | DOM wiring, UI state, orchestration | Дублировать расчетную геометрию |
| `geometry/` | Профиль, станции, теоретический чертеж | Читать DOM или canvas |
| `equipment/` | Оборудование, размеры, ограничения | Рендерить UI |
| `balance/` | ЦТ, ЦВ, плавучесть, предупреждения | Считать геометрию корпуса заново |
| `rendering/` | Canvas 2D, theoretical drawing canvas, Three.js | Владеть проектным состоянием |
| `persistence/` | JSON, CSV, SVG, download | Нормализовать UI controls |
| `ui/` | HTML snippets, tables, metrics, control helpers | Хранить бизнес-правила |
| `shared/` | Форматирование, math, logger | Становиться dumping ground |

## State Layers

| Layer | Type/File | Description |
| --- | --- | --- |
| Raw DOM | `index.html` controls | Значения input/select/checkbox |
| App input | `appState.ts` | Нормализованный `ProfileState` |
| Project aggregate | `projectState.ts` | `profile`, `equipment`, `scene3dSettings`, `balanceSettings` |
| Geometry snapshot | `ProfileSnapshot` | Общий источник для canvas, table, SVG, 3D |
| Reports | `EquipmentConstraintReport`, `EquipmentBalanceResult` | Диагностика компоновки и баланса |

## Data Flow on Update

При любом изменении размера корпуса, оборудования, воды или 3D-настроек вызывается `update()`:

1. `appState.readState()` нормализует профиль.
2. `makeProfileSnapshot()` создает гладкие и станционные точки.
3. `makeTheoreticalDrawing()` создает данные теоретического чертежа.
4. `evaluateEquipmentConstraints()` проверяет оборудование.
5. `normalizeScene3dSettings()` ограничивает настройки 3D.
6. `makeProjectState()` собирает состояние проекта.
7. `calculateEquipmentBalance()` считает баланс.
8. UI обновляет canvas, теоретический чертеж, оборудование, таблицу и баланс.
9. Three.js сцена перерисовывает корпус и оборудование.

## Rendering Architecture

| Renderer | Source Data | Output |
| --- | --- | --- |
| `canvas2d.ts` | `ProfileSnapshot`, equipment, constraints | Боковой вид |
| `rendering/theoretical-drawing.ts` | `TheoreticalDrawing` | Судостроительный лист на canvas |
| `scene3d.ts` | `ProfileSnapshot`, equipment, settings, constraints | Three.js scene |
| `mesh.ts` | Profile points | Hull mesh |
| `equipment3d.ts` | Equipment items | Equipment meshes |

Canvas/SVG/CSV должны использовать один и тот же `ProfileSnapshot`.

## Persistence Architecture

`project-json.ts` экспортирует и импортирует:

- `profile`;
- `equipment`;
- `scene3dSettings`;
- `balanceSettings`.

Импорт нормализует значения и возвращает предупреждения, но не меняет схему молча без `schemaVersion`.

## Error and Warning Strategy

В проекте используется `shared/logger.ts`. Основные правила:

- расчетные ошибки возвращаются структурированно через result/report;
- пользователь видит состояние в UI, не только console output;
- logger помогает отладке normalization, import/export и расчетных предупреждений;
- некорректное оборудование не ломает весь расчет баланса, а пропускается с warning.

## Testing Boundaries

| Area | Tests |
| --- | --- |
| Geometry | Formula fixture, ЦВК, stations, snapshot immutability |
| Theoretical drawing | Sections, waterlines, buttocks, body plan split |
| Equipment | Volume, validation, placement, constraints |
| Balance | CG, CB, buoyancy, warning codes |
| Persistence | CSV, SVG, JSON schema normalization |
| UI | Equipment editor, metrics, DOM contract |

## Future Architecture Notes

- Балласт, масса корпуса и оболочка должны добавляться в `balance`, а не в `geometry`.
- Более точные CAD-проверки оборудования должны расширять `equipment/constraints.ts` или новый соседний pure module.
- Новые export formats должны использовать `ProfileSnapshot` и `TheoreticalDrawing`, а не пересчитывать профиль.
- Новые UI-панели должны работать через app/project state, а не напрямую менять расчетные структуры.

## See Also

- [Calculations](calculations.md) — pure расчетные правила.
- [Data and Export](data-and-export.md) — структура JSON/CSV/SVG.
- [Testing](testing.md) — как проверяются границы модулей.
