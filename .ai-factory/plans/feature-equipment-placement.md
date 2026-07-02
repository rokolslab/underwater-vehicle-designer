# План реализации: оборудование, X-Ray и сечения корпуса

Branch: feature/equipment-placement
Created: 2026-07-01

## Настройки

- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage

Milestone: "Добавить модель оборудования и размещение внутри корпуса"
Rationale: Эта веха создает модель оборудования и рабочий 3D-режим видимости, без которых нельзя перейти к проверкам размещения и расчету ЦТ.

## Цель

Добавить базовую модель оборудования внутри корпуса и сделать его читаемым в 3D: X-Ray-режим с регулируемой прозрачностью корпуса в заданных пределах, а также произвольные поперечные и продольные разрезы. Проверки выхода за внутренний объем и пересечения объектов остаются следующей отдельной вехой.

## Область работ

- Оборудование: шар, цилиндр и параллелепипед с координатами, массой, размерами и ориентацией по главным осям.
- 3D-видимость: режимы `solid`, `x-ray`, `cutaway`; X-Ray включается как практичный режим для компоновки.
- Прозрачность корпуса: пользовательская регулировка в безопасных пределах, например `0.12..0.45`, чтобы корпус не исчезал полностью и не закрывал оборудование.
- Сечения: поперечный разрез по `x` и продольный разрез по одной из главных плоскостей с произвольной позицией.
- Экспорт SVG/CSV и баланс в этот план не входят.

## Архитектурные решения

- `src/modules/equipment/` остается чистым TypeScript-модулем без DOM, canvas и Three.js.
- UI/appState отвечает за пользовательский ввод, clamp/normalize и хранение настроек 3D-видимости.
- `ProfileSnapshot` остается общим источником геометрии корпуса; equipment и настройки 3D передаются рядом, а не вшиваются в расчетную геометрию.
- `scene3d.ts` остается адаптером Three.js. Если логика оборудования или сечений становится объемной, вынести ее в `equipment3d.ts` и `clipping.ts`.
- Для сечений использовать `THREE.Plane` и renderer-level/local clipping, а не изменять расчетную геометрию корпуса.

## Commit Plan

- **Commit 1** (после задач 1-3): `feat(equipment): add equipment domain model`
- **Commit 2** (после задач 4-5): `feat(rendering): add xray and cutaway controls`
- **Commit 3** (после задач 6-8): `feat(ui): integrate equipment placement workflow`

## Задачи

### Phase 1: Доменная модель оборудования

- [x] Task 1: Создать типы оборудования в `src/modules/equipment/model.ts`.

  Ожидаемое поведение:
  - описать `EquipmentItem` с `id`, `name`, `shape`, `massKg`, `position`, `orientation`;
  - поддержать `sphere`, `cylinder`, `box`;
  - оформить shape-специфичные размеры как discriminated model, чтобы размеры шара, цилиндра и box нельзя было смешать между типами;
  - для шара хранить `radius`, для цилиндра `radius` и `length`, для box `width`, `height`, `depth`;
  - ориентацию ограничить главными осями, чтобы будущий расчет ЦТ и проверки оставались однозначными;
  - добавить pure helpers `equipmentVolume(item)` и `equipmentCenter(item)`, чтобы будущие ЦТ/ЦВ не дублировали shape math;
  - зафиксировать default displaced volume как геометрический объем объекта без реализации balance-расчетов в этом инкременте;
  - добавить другие pure helpers только если они реально снижают дублирование.

  LOGGING REQUIREMENTS:
  - В type-only коде не логировать.
  - Если добавляются factory/helpers, логировать `DEBUG` только нормализацию входных данных.
  - Валидационные ошибки возвращать структурно, без прямого `console`.

- [x] Task 2: Реализовать операции размещения в `src/modules/equipment/placement.ts`.

  Ожидаемое поведение:
  - создать дефолтный equipment item;
  - создавать элементы через явный стабильный `id` source и не выводить persisted `id` из позиции в массиве;
  - разрешить тестам передавать deterministic IDs или `idFactory`, чтобы update/delete/rename проверялись воспроизводимо;
  - добавить update/delete/rename по `id`;
  - нормализовать массу, координаты и размеры с положительными минимумами;
  - сохранять стабильный порядок элементов для UI и будущего JSON export.

  Файлы:
  - `src/modules/equipment/placement.ts`
  - `src/modules/equipment/placement.test.ts`

  LOGGING REQUIREMENTS:
  - `DEBUG` при create/update/delete с `id`, `shape`, измененными полями и итоговым количеством объектов.
  - `WARN` при clamp некорректных чисел или update/delete неизвестного `id`.
  - Не логировать полный список объектов на каждый input event.

### Phase 2: Настройки 3D-видимости

- [x] Task 3: Создать модель настроек 3D-обзора.

  Ожидаемое поведение:
  - добавить тип `Scene3dViewMode = "solid" | "x-ray" | "cutaway"` или эквивалент;
  - добавить `hullOpacity` с clamp в пределах `0.12..0.45` для X-Ray/Cutaway;
  - добавить модель сечения: `disabled`, `crossSectionX`, `longitudinalPlane`;
  - для поперечного сечения хранить позицию `x` в пределах `0..totalLength`;
  - для продольного сечения хранить плоскость/ось и смещение в пределах радиуса корпуса.

  Файлы:
  - `src/modules/rendering/model.ts`
  - возможно `src/modules/rendering/viewSettings.ts`
  - соответствующие `.test.ts` для pure normalization.

  LOGGING REQUIREMENTS:
  - `DEBUG` при normalize настроек видимости.
  - `WARN` при clamp прозрачности или позиции сечения.
  - Логи должны содержать режим, исходное значение и normalized value.

- [x] Task 4: Реализовать X-Ray и сечения в Three.js-рендерере.

  Ожидаемое поведение:
  - корпус в X-Ray/Cutaway рендерится с `transparent: true`, ограниченной `opacity`, `depthWrite: false` и wireframe/outline;
  - оборудование рендерится непрозрачным поверх читаемой оболочки;
  - поперечный разрез работает как clipping plane по оси `x`;
  - продольный разрез работает как clipping plane по выбранной главной плоскости;
  - renderer-level/local clipping явно включает `renderer.localClippingEnabled` только для режимов, где сечение активно, и задает clipping planes через настройки текущего режима;
  - возврат в `solid` явно восстанавливает material state корпуса: `transparent`, `opacity`, `depthWrite` и пустые clipping planes, чтобы переиспользуемые Three.js materials не сохраняли состояние X-Ray/Cutaway;
  - clipping не меняет `ProfileSnapshot` и не влияет на 2D/SVG/CSV;
  - resize не пересоздает геометрию без необходимости.

  Файлы:
  - `src/modules/rendering/scene3d.ts`
  - возможно `src/modules/rendering/clipping.ts`
  - возможно `src/modules/rendering/equipment3d.ts`

  LOGGING REQUIREMENTS:
  - `DEBUG` при смене режима, opacity и clipping plane.
  - `WARN`, если renderer недоступен или clipping settings некорректны.
  - `ERROR` при ошибках создания/dispose geometry с контекстом режима.

### Phase 3: UI и workflow

- [x] Task 5: Добавить controls для 3D-видимости.

  Ожидаемое поведение:
  - добавить компактный блок 3D-настроек рядом с 3D-панелью;
  - использовать segmented control или select для режима `solid/x-ray/cutaway`;
  - использовать slider/input для прозрачности корпуса с явно заданными min/max;
  - использовать controls для типа сечения и позиции разреза;
  - не добавлять текстовые подсказки, которые дублируют очевидную функцию controls;
  - обеспечить адаптивность без наложения текста и элементов.

  Файлы:
  - `index.html`
  - `src/app/styles.css`
  - `src/modules/ui/controls.ts`
  - возможно `src/modules/ui/scene3dControls.ts`

  LOGGING REQUIREMENTS:
  - `DEBUG` при связывании DOM controls и изменении режима.
  - `INFO` при явной смене режима пользователем.
  - `WARN` при невозможности найти обязательный DOM-элемент.

- [x] Task 6: Добавить UI для списка оборудования.

  Ожидаемое поведение:
  - добавить добавление/удаление элемента;
  - дать редактирование имени, shape, массы, координат и размеров;
  - показывать только релевантные поля размеров для выбранного shape;
  - не смешивать таблицу оборудования с таблицей координат станций;
  - ввести `ProjectState` или эквивалентный app-layer aggregate с `{ profile, equipment, scene3dSettings }`;
  - оставить `ProfileState` только для параметров корпуса, чтобы equipment и 3D-настройки не попадали в расчетную геометрию, SVG и CSV;
  - reset должен согласованно сбрасывать корпус, equipment и 3D-настройки.

  Файлы:
  - `index.html`
  - `src/app/styles.css`
  - `src/modules/ui/equipment.ts`
  - `src/app/main.ts`
  - `src/app/appState.ts` или новый `src/app/projectState.ts`

  LOGGING REQUIREMENTS:
  - `DEBUG` при чтении equipment state из UI.
  - `INFO` при add/delete equipment.
  - `WARN` при normalize некорректных значений.

- [x] Task 7: Отобразить оборудование в 3D-сцене.

  Ожидаемое поведение:
  - `HullScene3d.render` принимает `ProfileSnapshot`, equipment list и настройки 3D;
  - render держит отдельные signatures для hull geometry и equipment, всегда применяет view settings/clipping на каждый вызов и перестраивает hull mesh только при изменении hull signature;
  - шар рендерится через `SphereGeometry`;
  - цилиндр рендерится через `CylinderGeometry` с ориентацией по `x/y/z`;
  - box рендерится через `BoxGeometry`;
  - координата оборудования `x` задается от носа `0..L`, а в сцене переводится в `x - totalLength / 2`;
  - equipment meshes пересоздаются только при изменении equipment signature.

  Файлы:
  - `src/modules/rendering/scene3d.ts`
  - `src/modules/rendering/equipment3d.ts`
  - `src/modules/rendering/equipment3d.test.ts` для pure signature/transform helpers.

  LOGGING REQUIREMENTS:
  - `DEBUG` при пересборке equipment meshes с количеством объектов и signature.
  - `WARN` при неизвестном shape.
  - `ERROR` при ошибках geometry creation/dispose с `id` и `shape`.

### Phase 4: Проверка и документация

- [x] Task 8: Покрыть инкремент тестами и обновить AI Factory-документацию.

  Ожидаемое поведение:
  - добавить Vitest-тесты для equipment model/placement;
  - добавить тесты для normalization 3D settings и pure clipping/equipment transform helpers;
  - выполнить `npm run test`, `npm run build`, `npm run check:encoding`;
  - выполнить browser/in-app smoke для desktop и mobile width: запустить Vite, подтвердить nonblank 3D canvas, переключить `solid/x-ray/cutaway`, изменить controls сечений, добавить минимум один equipment item и проверить отсутствие наложения controls;
  - обновить `AGENTS.md` и `.ai-factory/DESCRIPTION.md`, если структура `src/modules/equipment/` и режимы 3D стали частью карты проекта;
  - не отмечать roadmap milestone завершенной до прохождения verify.

  LOGGING REQUIREMENTS:
  - Тесты проверяют результат нормализации, но не зависят от реального `console`.
  - Документационный checkpoint фиксирует, какие файлы обновлены и почему.

## Риски и ограничения

- Прозрачность корпуса сама по себе недостаточна для плотной компоновки; поэтому Cutaway является обязательной частью этого инкремента.
- Three.js clipping нужно внедрять как визуальный режим, не как изменение расчетной геометрии.
- Система координат требует аккуратности: расчетный профиль хранит `x` от `0` до `L`, а 3D mesh центрируется вокруг нуля.
- Проверки выхода оборудования за корпус и пересечений не входят в этот план, но модель должна быть готова к этим проверкам.
- Нужно сохранить производительность: input events не должны пересоздавать hull mesh, если меняются только equipment или настройки сечения.

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
