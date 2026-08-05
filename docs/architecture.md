[← Calculations](calculations.md) · [Back to README](../README.md) · [Data and Export →](data-and-export.md)

# Architecture

Проект является frontend-only инженерным SPA. Текущий код организован как модульный монолит, а целевое направление уточняет его границы: functional core для расчётов, explicit application layer для состояния проекта и browser adapters для DOM, Canvas, Three.js и persistence.

Целевая архитектура описывает поэтапную эволюцию, а не уже завершённый перенос файлов. Подробные нормативные правила находятся в [`.ai-factory/ARCHITECTURE.md`](../.ai-factory/ARCHITECTURE.md).

## Current Runtime

```text
index.html
  -> src/app/main.ts
    -> appState / import adapters normalize inputs into ProjectCommand
    -> reduceProject() computes immutable ProjectInputs transition
    -> ProjectStore.dispatch() commits canonical ProjectInputs
    -> deriveProject(ProjectInputs) creates ProjectEvaluation
    -> projectEvaluationRuntime publishes { inputsSnapshot, evaluation }
    -> adapters render Canvas, Three.js, tables, metrics and exports
```

`main.ts` является composition root и browser controller. Он не содержит формул корпуса и больше не собирает временный `ProjectState`; canonical mutations идут через typed `ProjectCommand` и `ProjectStore.dispatch()`, а производные данные создаются чистым `deriveProject()` и публикуются одной coherent парой через `src/app/projectEvaluationRuntime.ts`.

## Current Module Boundaries

| Module | Responsibility | Must Not Do |
| --- | --- | --- |
| `src/app/` | Bootstrap, DOM events → commands, explicit runtime commit и adapter orchestration | Дублировать расчётные формулы |
| `src/application/project/` | Commands, reducer, store, normalization и `deriveProject()` | Импортировать DOM, rendering, persistence или logger в reducer/store |
| `geometry/` | Профиль, `SectionShape`, стратегии геометрии, станции, theoretical drawing data | Читать DOM, Canvas, Three.js или logger |
| `equipment/` | Оборудование, placement, containment и intersections | Рендерить UI |
| `balance/` | Equipment-only CG/CB, силы и stability diagnostics | Считать геометрию корпуса заново |
| `rendering/` | Canvas 2D, Three.js, mesh и coordinate adapters | Владеть каноническим project state |
| `persistence/` | JSON migrations, CSV, SVG и download | Получать данные через DOM controls |
| `ui/` | Typed DOM adapters, таблицы и metrics | Хранить инженерные формулы |
| `shared/` | Body coordinates, math, format и logger | Становиться dumping ground |

Прямых циклических зависимостей между production-модулями нет. Three.js импортируется только rendering adapters, а основная геометрия остаётся независимой от browser runtime.

## Current State Flow

Состояние разделено на canonical inputs, view settings и последнюю успешную publication:

| Data | Current owner |
| --- | --- |
| Project inputs: profile, equipment, balance settings | `ProjectStore` в application layer |
| View settings: grid, points, 3D mode/sections | `ProjectViewState` в app layer |
| Derived geometry/reports/balance | `ProjectEvaluation` из `deriveProject()` |
| Latest coherent render/export pair | `ProjectEvaluationPublication` в `projectEvaluationRuntime.ts` |
| Camera interaction | Closure внутри Three.js scene |
| JSON export | Fresh `ProjectInputs + ProjectViewState`, без derived evaluation |

При canonical изменении выполняется pipeline:

```text
DOM event / JSON import
  -> normalize inputs
  -> ProjectCommand
  -> reduceProject()
  -> ProjectStore.dispatch()
  -> deriveProject(ProjectInputs)
  -> publish { inputsSnapshot, ProjectEvaluation }
  -> render adapters
```

View-only события (`showGrid`, `showPoints`, 3D settings, resize) повторно используют текущую publication и не запускают `deriveProject()`. Production subscription `ProjectStore` → render не используется: `main.ts` явно вызывает runtime commit после changed command. Если derive падает после canonical commit, store остается обновленным, а engineering rendering/export продолжает использовать предыдущую coherent publication; JSON export отражает свежий store.

## Target Pattern

Целевой паттерн:

> Modular Monolith + Functional Core + Explicit Application Layer + Browser Adapters

```text
app/main.ts
    |
    v
application ---------------> core
    ^                          ^
    |                          |
adapters ---------------------+
```

| Layer | Responsibility |
| --- | --- |
| `core` | Geometry, equipment, constraints, mass properties, hydrostatics и другие pure calculations |
| `application` | Канонический project state, commands, reducer, normalization и `deriveProject()` |
| `adapters` | DOM, Canvas, Three.js, JSON, CSV, SVG, browser files и logging |
| `app` | Создание зависимостей, subscriptions и startup |

Core не импортирует application, adapters, DOM, Canvas, Three.js, `import.meta.env` или глобальный logger. Application не читает controls и не управляет Three.js resources.

## Target State Flow

DOM становится adapter, а не источником истины:

```text
DOM event
  -> ProjectCommand
  -> reduceProject()
  -> ProjectStore
  -> canonical ProjectInputs
  -> deriveProject()
  -> ProjectEvaluation
  -> DOM / Canvas / Three.js / export adapters
```

Импорт применяется атомарно:

```text
File
  -> JSON decode
  -> schema migration
  -> shared normalization
  -> ReplaceProject command
  -> replace ProjectViewState
  -> ProjectStore.dispatch()
  -> write controls
  -> deriveProject()
  -> publish/render
```

Запись JSON-данных в controls с последующим чтением обратно не входит в целевую архитектуру. Ошибка чтения/prepare до dispatch не меняет store/view; ошибка controls или render после dispatch не откатывает canonical state.

## State Contracts

Целевая модель разделяет четыре вида данных:

| Contract | Purpose |
| --- | --- |
| `ProjectInputs` | Канонические пользовательские и инженерные inputs |
| `ProjectViewState` | Grid, points, camera и остальные view settings |
| `ProjectEvaluation` | `ProfileSnapshot`, `TheoreticalDrawing`, constraints и equipment-only balance results |
| `ProjectDocumentV3+` | Versioned persistence DTO и migration boundary |

`ProfileSnapshot` остаётся производным geometry contract, но не должен использоваться как название универсального снимка всего проекта. Для comparison нужен отдельный versioned `DesignSnapshot`.

## Coordinate Architecture

Проект разделяет четыре пространства:

| Space | Contract |
| --- | --- |
| Body/SNAME-NED | Инженерные позиции, силы, моменты и сечения; `+X` к носу, `+Y` на правый борт, `+Z` вниз |
| Profile | Параметр `s ∈ [0,L]` от носа к корме |
| Three.js | Техническая Y-up сцена |
| Canvas/SVG | Screen coordinates конкретной проекции |

`src/shared/body-coordinates.ts` владеет текущими Body/Profile conversions. `rendering/coordinate-adapter.ts` является границей Body↔Three и Body↔screen:

```text
three.x = body.x
three.y = -body.z
three.z = body.y
```

В целевой структуре Body conversions переходят в `core/coordinates`, а Three/screen transforms остаются в adapters.

## General Section Geometry

Текущие режимы используют эллиптические сечения `halfBreadthY`/`halfHeightZ`. Для будущих `Priam`/`Kr` этого контракта недостаточно.

До расширения legacy geometry введён общий `SectionShape` seam. Текущая production-реализация intentionally ellipse-only:

```ts
type SectionShape = { kind: "ellipse"; halfBreadthY: number; halfHeightZ: number };
```

Общие pure operations рассчитывают площадь, containment, normals, waterline/buttock intersections и sampled contour. `ProfileSnapshot` хранит shape-bearing section extents: `shape` плюс compatibility fields `radius`, `halfBreadthY`, `halfHeightZ`, `topRadius` и `bottomRadius`. Mesh, constraints, theoretical drawing Canvas/SVG и future integration используют shape operations или shape-derived data, а не локальные ellipse equations и не ветвятся по формулам `geometryMode`.

## Physical Hull Models

В целевой domain model разделяются разные значения слова «корпус»:

| Model | Physical meaning |
| --- | --- |
| `HydrodynamicFairing` | Внешняя форма для обводов и будущей ходкости |
| `PlacementEnvelope` | Допустимая область размещения оборудования |
| `StructuralMassModel` | Масса оболочки, конструкций и переборок |
| `WatertightEnvelope` | Герметичный вытесняющий объём для hydrostatics |

Equipment-only displacement и watertight-envelope buoyancy не складываются неявно. Выбранная `BuoyancyModel` должна иметь discriminator и правила предотвращения double counting.

## Rendering and Export

| Adapter | Source data | Output |
| --- | --- | --- |
| `canvas2d.ts` | Geometry snapshot, equipment, constraints | Боковой вид |
| `rendering/theoretical-drawing.ts` | `TheoreticalDrawing` | Судостроительный лист на Canvas |
| `scene3d.ts` | Geometry snapshot, equipment, view settings | Three.js scene |
| `mesh.ts` | `sampleSectionContour()` из shape-bearing `ProfileSnapshot` | Hull mesh data |
| CSV/SVG builders | Snapshot или presentation-neutral drawing data | Downloadable text/vector files |

Rendering и engineering export не пересчитывают geometry или balance. Canvas, tables, metrics, Three.js, profile SVG/CSV и theoretical SVG читают текущую publication. JSON export намеренно строится из свежих `ProjectInputs + ProjectViewState` и не сериализует `ProjectEvaluation`.

## Error and Diagnostics Strategy

- Core возвращает stable diagnostic codes и параметры без русских UI messages.
- Presentation adapters преобразуют diagnostics в пользовательский текст.
- Ошибка одного equipment item не должна разрушать весь aggregate calculation.
- Logger принадлежит application/adapters boundary и не вызывается из pure calculations.
- Persistence decoders принимают `unknown`, выполняют migrations и используют общие normalizers.

## Testing Boundaries

| Area | Required tests |
| --- | --- |
| Core calculations | Unit, invariants и fixture regressions |
| Coordinates | Frame conversions и signs |
| Application | Commands, reducer/store matrix, normalization и `deriveProject()` |
| Persistence | Migration, normalization и round-trip |
| Rendering data | Mesh/drawing primitives без WebGL |
| Browser adapters | Targeted integration или Playwright smoke |
| Architecture | Dependency-boundary check без запрещённых imports |

## Evolution Order

1. Закрепить import/export integration tests, включая gravity и уникальность equipment IDs.
2. Ввести canonical `ProjectInputs` и единый command/reducer/store API. ✅ Реализовано для текущих canonical mutations.
3. Объединить DOM и JSON normalization.
4. Извлечь pure `deriveProject()` и оставить в `main.ts` только wiring. ✅ Реализовано для текущих geometry/drawing/constraints/equipment-only balance.
5. Разделить domain inputs, view settings и persistence DTO.
6. Ввести `SectionShape` до расширения legacy geometry.
7. Разделить `constraints.ts`, `scene3d.ts` и `project-json.ts` по ответственности.
8. Добавлять mass properties, hydrostatics, comparison, hydrodynamics и energy отдельными pure capabilities.

Физическое перемещение существующих каталогов не должно выполняться ради структуры само по себе. Каждый шаг должен иметь самостоятельный behavioural seam и regression tests.

## See Also

- [Calculations](calculations.md) — действующие формулы и ограничения.
- [Data and Export](data-and-export.md) — текущая JSON schema и export contracts.
- [Testing](testing.md) — unit, regression и browser smoke проверки.
