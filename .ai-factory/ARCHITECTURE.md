# Архитектура: Modular Monolith с Functional Core

## Обзор

Underwater Vehicle Designer развивается как frontend-only модульный монолит. Расчётное ядро состоит из чистых TypeScript capabilities, application layer владеет каноническим состоянием проекта и последовательностью вычислений, а DOM, Canvas, Three.js, JSON и файловые операции остаются внешними adapters.

Целевая схема развивает существующий код без big-bang rewrite. Текущие модули `geometry`, `equipment` и `balance` уже образуют полезное functional core, но состояние пока распределено между DOM controls и module-level переменными, а `main.ts` совмещает composition root и application controller. Первый архитектурный переход — ввести единые `ProjectInputs`, общий normalization pipeline и чистый `deriveProject()`.

## Обоснование решения

- **Тип проекта:** браузерный инженерный инструмент с вычислительной геометрией, компоновкой, 2D/3D-визуализацией и versioned persistence.
- **Стек:** TypeScript, Vite, Vitest, Canvas 2D, Three.js.
- **Ключевой фактор:** формулы и инженерные результаты должны быть воспроизводимыми, тестируемыми и независимыми от UI и rendering lifecycle.
- **Почему не строгие Vertical Slices:** geometry, constraints, mass properties и hydrostatics используются сразу несколькими UI, rendering и export сценариями; разбиение по экранным use cases привело бы к дублированию расчётов.
- **Почему не полная Clean/Hexagonal Architecture:** проект не имеет backend, базы данных и большого числа сменяемых внешних интеграций; repository/service abstraction не должна усложнять чистые математические функции.
- **Почему не Microservices:** приложение развёртывается как единый frontend bundle и не имеет независимых runtime services.

## Текущее состояние

```text
src/
├── app/
│   ├── main.ts                 # Composition root и текущий application controller
│   ├── appState.ts             # Чтение и нормализация profile controls
│   └── projectState.ts         # Временный aggregate текущего проекта
├── modules/
│   ├── geometry/               # Профиль, стратегии геометрии, сечения, theoretical drawing data
│   ├── equipment/              # Модель, placement и constraints
│   ├── balance/                # Equipment balance и stability diagnostics
│   ├── rendering/              # Canvas, Three.js, mesh и coordinate adapters
│   ├── persistence/            # JSON migrations, CSV, SVG и browser download
│   └── ui/                     # Typed DOM adapters
└── shared/                     # Body coordinates, math, format и logger
```

Эта структура остаётся допустимой во время рефакторинга. Новые границы сначала вводятся контрактами и направлением зависимостей; физический перенос файлов выполняется отдельными проверяемыми шагами.

## Целевая структура

```text
src/
├── app/
│   └── main.ts                         # Только bootstrap, wiring и subscriptions
├── application/
│   ├── project/
│   │   ├── model.ts                    # ProjectInputs и ProjectViewState
│   │   ├── defaults.ts
│   │   ├── normalize.ts                # Общий normalization pipeline
│   │   ├── reducer.ts                  # Команды изменения проекта
│   │   ├── derive.ts                   # Чистый deriveProject()
│   │   └── store.ts                    # Каноническое application state
│   └── diagnostics/
│       └── model.ts                    # Коды и параметры диагностик
├── core/
│   ├── coordinates/                    # Body/SNAME-NED и доказанные conversions
│   ├── geometry/
│   │   ├── model.ts
│   │   ├── section-shape.ts            # Общий SectionShape contract
│   │   ├── profile.ts
│   │   ├── theoretical-drawing.ts
│   │   └── strategies/
│   │       ├── current-formula.ts
│   │       └── legacy-dsnp-pa.ts
│   ├── equipment/
│   ├── constraints/
│   ├── mass-properties/
│   ├── hydrostatics/
│   ├── stability/
│   ├── comparison/
│   ├── hydrodynamics/
│   └── energy/
├── adapters/
│   ├── dom/
│   ├── canvas/
│   ├── three/
│   ├── persistence/
│   │   ├── json/
│   │   └── migrations/
│   ├── export/
│   │   ├── csv/
│   │   └── svg/
│   ├── browser-files/
│   └── logging/
└── shared/                              # Только минимальные независимые primitives
```

Имена каталогов являются целевой картой, а не требованием немедленного массового перемещения. На переходном этапе существующие `src/modules/*` могут выполнять роли `core` и `adapters`, если соблюдают правила зависимостей.

## Направление зависимостей

```text
app/main.ts
    |
    v
application ---------------> core
    ^                          ^
    |                          |
adapters ---------------------+

core не зависит от application, adapters или app.
application не зависит от DOM, Canvas, Three.js и browser files.
```

Разрешено:

- `app` импортирует application и adapters для wiring.
- `application` импортирует core contracts и pure calculations.
- adapters импортируют application/core types, которые они декодируют, отображают или сериализуют.
- core capabilities импортируют только другие явно разрешённые core contracts и минимальный shared kernel.

Запрещено:

- core импортирует DOM, Canvas, Three.js, `import.meta.env`, browser files или глобальный logger.
- rendering, persistence и UI пересчитывают geometry, balance или hydrostatics.
- DOM controls выступают источником истины для проекта.
- persistence DTO становится вторым владельцем application aggregate.
- один core module импортирует presentation messages другого модуля.
- adapters имеют циклические импорты друг с другом; общий чистый contract должен быть поднят в core или application.

## Состояние и snapshots

Термин `snapshot` всегда квалифицируется. Целевая модель различает:

- `ProjectInputs` — канонические нормализованные пользовательские данные.
- `ProjectViewState` — grid, points, camera и другие настройки отображения.
- `ProjectEvaluation` — производные geometry, constraints, mass и hydrostatic results.
- `HullGeometrySnapshot` — производная геометрия корпуса для расчётов и adapters.
- `DesignSnapshot` — versioned immutable состояние для comparison.
- `ProjectDocumentV3` и последующие версии — persistence DTO, а не domain state.

DOM event преобразуется в application command. Reducer или эквивалентный единый controller создаёт новое состояние, после чего `deriveProject()` вычисляет результаты, а adapters отображают их.

```text
DOM event
  -> application command
  -> ProjectStore
  -> ProjectInputs
  -> deriveProject()
  -> ProjectEvaluation
  -> DOM / Canvas / Three.js / export adapters
```

Импорт выполняется атомарно:

```text
File
  -> JSON decode
  -> schema migration
  -> normalizeProjectInputs()
  -> ReplaceProject command
  -> deriveProject()
  -> render
```

Запись импортированных данных в DOM с последующим повторным чтением не допускается.

## Геометрический контракт

`SectionExtents` с двумя полуосями достаточен только для текущих эллиптических режимов. До реализации `Priam`/`Kr` вводится общий discriminated `SectionShape`:

```ts
export type SectionShape =
  | {
      readonly kind: "ellipse";
      readonly halfBreadthY: number;
      readonly halfHeightZ: number;
    }
  | {
      readonly kind: "rounded-rectangle";
      readonly halfBreadthY: number;
      readonly halfHeightZ: number;
      readonly cornerRadius: number;
    };
```

Общие pure operations владеют площадью, containment и sampling контура. Mesh, constraints, theoretical drawing и numerical integration используют эти operations и не ветвятся по `geometryMode`.

```ts
export interface HullGeometry {
  sectionAt(s: number): SectionShape;
  areaAt(s: number): number;
  contains(point: BodyPoint3): boolean;
  sampleContour(s: number, count: number): readonly BodyPoint3[];
}
```

`HullGeometry` является производным runtime contract и не сериализуется в JSON.

## Физические модели корпуса

Слово «корпус» не должно скрывать разные физические сущности:

- `HydrodynamicFairing` — внешний обвод для формы и будущей ходкости.
- `PlacementEnvelope` — допустимая область размещения оборудования.
- `StructuralMassModel` — масса оболочки, переборок и конструкций.
- `WatertightEnvelope` — герметичный вытесняющий объём для hydrostatics.

Эти модели могут использовать общие geometry primitives, но имеют разные владельцы и не складываются неявно. Equipment-only displacement и watertight-envelope buoyancy объединяются только выбранной `BuoyancyModel` с явным discriminator и правилами double counting.

## Расчётный граф

Расчётные capabilities образуют явный DAG:

```text
ProjectInputs
  +-> HullGeometry
  |     +-> Placement constraints
  |     +-> Watertight volume
  |     +-> Hydrodynamics
  +-> Mass model
  |     +-> CG
  |     +-> Inertia tensor
  +-> Buoyancy model
        +-> CB
        +-> Forces
        +-> Stability diagnostics
```

Если будущая energy model создаёт обратную связь `resistance -> power -> storage mass -> total mass/geometry -> resistance`, она реализуется отдельным solver с iteration state, convergence criterion и diagnostics. Такой цикл нельзя скрывать в `main.ts` или mutable project state.

## Коммуникация модулей

- Core functions принимают immutable data и возвращают result objects или diagnostics без side effects.
- Engineering diagnostics содержат стабильный code и параметры; русские сообщения формируются presentation adapter.
- Application layer координирует расчёты, но не реализует formulas.
- Rendering получает готовые geometry/results и владеет только ресурсами и локальным view state.
- Persistence декодирует `unknown`, применяет migrations и вызывает общие normalizers.
- Export adapters преобразуют готовые snapshots/results, не обращаясь к DOM.
- Body/SNAME-NED conversions находятся в одном core module; Three.js и screen transforms находятся на adapter boundary.

## Ключевые принципы

1. Один канонический application state вместо DOM-backed state.
2. Один normalization pipeline для DOM, JSON и будущих import adapters.
3. Pure domain first: contract и тесты предшествуют persistence, UI и rendering.
4. Derived data не сохраняется как независимый источник истины без явной причины и версии.
5. Geometry mode скрыт за общим section/geometry contract.
6. Units, coordinate frame, validity и provenance являются частью инженерного контракта.
7. Legacy DSNP_PA используется как reference и traceability source, но не переносит Pascal state и DOS architecture.
8. Compatibility поддерживается только для существующих persisted или внешних контрактов.
9. Рефакторинг выполняется через малые seams с regression tests, а не массовым перемещением каталогов.

## Организация существующего кода

- Новые расчётные функции должны следовать целевым dependency rules уже до физического переноса в `core/`.
- Существующие файлы не перемещаются только ради соответствия дереву каталогов.
- При изменении `main.ts` application workflow извлекается за один seam с тестами.
- `constraints.ts`, `scene3d.ts` и `project-json.ts` разделяются по ответственности при функциональном изменении или отдельном плане рефакторинга.
- Deprecated `center-of-buoyancy.ts` не становится основой hydrostatics; новый watertight contract разрабатывается независимо и заменяет его только после верификации.

## Примеры

### Чистое получение производных данных

```ts
export interface ProjectEvaluation {
  readonly hullGeometry: HullGeometrySnapshot;
  readonly constraints: EquipmentConstraintReport;
  readonly balance: EquipmentBalanceResult;
  readonly theoreticalDrawing: TheoreticalDrawing;
}

export function deriveProject(inputs: ProjectInputs): ProjectEvaluation {
  const hullGeometry = makeHullGeometrySnapshot(inputs.hull);
  return Object.freeze({
    hullGeometry,
    constraints: evaluateEquipmentConstraints(hullGeometry, inputs.equipment),
    balance: calculateEquipmentBalance(inputs.balance, inputs.equipment),
    theoreticalDrawing: makeTheoreticalDrawing(hullGeometry),
  });
}
```

### Adapter не владеет состоянием

```ts
controls.onProfileChanged((rawInput) => {
  projectStore.dispatch({ type: "profileChanged", rawInput });
});

projectStore.subscribe(({ inputs, evaluation }) => {
  controls.render(inputs);
  canvasRenderer.render(evaluation);
  scene3dRenderer.render(evaluation);
});
```

## Антипаттерны

- Хранить канонические project inputs только в DOM controls.
- После JSON import записывать значения в DOM, чтобы затем прочитать их обратно.
- Дублировать defaults и clamp rules в UI и persistence.
- Добавлять очередные compatibility aliases в canonical domain model.
- Ветвить mesh, constraints и exports по каждой реализации `geometryMode`.
- Помещать русские UI messages и formula labels в core model.
- Логировать из pure calculations через глобальный Vite-aware logger.
- Называть equipment-only CB полным ЦВ корпуса или текущие moment diagnostics полной hydrostatic stability.
- Смешивать hydrodynamic fairing, placement envelope, structural shell и watertight envelope одним неявным типом.
- Прятать циклические инженерные зависимости в последовательности mutable updates.

## Порядок эволюции

1. Закрепить integration tests для import/export, gravity и уникальности equipment IDs.
2. Ввести канонические `ProjectInputs` и единый application API изменения состояния.
3. Объединить DOM/JSON normalizers.
4. Извлечь чистый `deriveProject()` и сократить `main.ts` до wiring.
5. Разделить domain inputs, view settings и compatibility DTO.
6. Ввести `SectionShape` до расширения legacy geometry.
7. Разделить крупные orchestrators и adapters по lifecycle/ответственности.
8. Добавлять mass properties, hydrostatics, comparison, hydrodynamics и energy как отдельные pure capabilities.

Подробные исследовательские основания и открытые вопросы находятся в `.ai-factory/RESEARCH.md`.
