# Карта интеграции наследия ДСНП_ПА

## Назначение и ограничения

Этот документ сопоставляет подтверждённые функции ДСНП_ПА с текущей
архитектурой `underwater-vehicle-designer`. Исторический код используется как
reference, а не как спецификация и не как доказательство инженерной валидности.
Перенос означает новую чистую TypeScript-реализацию с собственными именами,
типами, источниками и тестами; прямое транслирование Pascal-кода не предлагается.

Современный координатный контракт — Body/SNAME-NED с началом в центре корпуса:
`+X` к носу, `+Y` на правый борт, `+Z` вниз. Координаты ДСНП_ПА нельзя считать
совпадающими с ним без отдельного восстановления соглашений и явного adapter.

Категории решения:

- **самостоятельная реализация** — реализовать заново после фиксации контракта;
- **reference** — использовать для выявления требований и контрольных сценариев;
- **внешняя проверка** — сначала подтвердить методику независимыми источниками;
- **исторический материал** — сохранить как контекст без продуктового переноса;
- **не переносить** — DOS/UI/служебное поведение не соответствует архитектуре.

## Матрица сопоставления

| Исторический модуль | Историческая функция | Современный модуль | Текущее состояние | Предлагаемое действие | Зависимости | Риск | Приоритет |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UDIFFER.PAS` / `TYPE_PA.PAS` | Массы, центры и моменты инерции элементов и аппарата | `balance/` | Есть equipment-only CG/CB и силовые моменты; тензора инерции нет | **Самостоятельная реализация** чистого inertia slice; формулы использовать как reference и сверить по стандартной механике | Body/SNAME-NED, mass items, единицы, правила осей | Средний: исторические оси и обозначения неоднозначны | P0 |
| `TABL.PAS` / `TYPE_PA.PAS` | Табличный баланс масс и энергетических потребностей | `balance/`, будущий `energy/` либо typed submodel в `balance/` | Только оборудование, масса и displaced volume | Массовую агрегацию — **самостоятельная реализация**; энергетику — **reference** до выделения владельца | Классификация нагрузок, project state, persistence | Средний/высокий: смешаны масса и мощность | P1/P4 |
| `BOXS.PAS` | Ввод исходных данных, геометрия, проект и прототип | `app/`, `geometry/`, `persistence/` | Typed профиль и JSON project существуют; прототипа нет | Требования использовать как **reference**; DOS forms **не переносить** | Новый comparison model, schema versioning | Средний: исторические поля не равны современному API | P3 |
| `APPAUNIT.PAS` | Геометрия обводов, сечения и BGI-отрисовка теоретического чертежа (`MaxBt`, `MaxWl`, `Bok`, `Shirota`, `Korp`, `Teoret`) | `geometry/` и rendering adapters | Современные `ProfileSnapshot`, theoretical drawing, Canvas/SVG/Three.js уже разделяют расчётные данные и вывод | Формулы использовать как **reference** для независимых geometry regressions; BGI rendering **не переносить** | Явное сопоставление исторических координат и нормировки корпуса | Средний | P2 |
| `FILERER.PAS` / `TYPE_PA.PAS` | Чтение/запись `.PRE` и `.PRT` как `file of A` | `persistence/` | Версионированный JSON v2; legacy binary import отсутствует | Сначала **внешняя/экспериментальная проверка** binary layout; потенциальный offline importer держать отдельно от browser runtime | Точная версия Turbo Pascal, record size, fixture-файлы | Очень высокий: ABI, packing, enum/real/string sizes | P5 |
| `HODK.PAS` | Ходкость, сопротивление и связанные показатели | Будущий pure domain module, не `rendering` | Не реализовано | **Внешняя проверка** методики; затем новая модель | Геометрия, режим движения, свойства воды, источники коэффициентов | Высокий | P4 |
| `ESOBRASP.PAS` | Эскиз/сечения/размещение и графический вывод | `geometry/`, `equipment/`, `rendering/` | 2D/3D, сечения и containment уже реализованы | Математику сечений использовать как **reference**; Graph UI **не переносить** | Явный legacy-coordinate adapter | Средний | P2/P3 |
| `STOIMOST.PAS` | Стоимостные зависимости и отчёты | Будущий отдельный cost domain | Не реализовано | Только структура факторов как **reference**; коэффициенты 1996 года — **исторический материал** | Новая валюта/база цен/год и источники | Очень высокий | P5 |
| `TRANS.PAS` / `TRANSFOR.PAS` / `TYPE_PAO.PAS` | Конвертация старой версии record | Offline migration tooling | Нет legacy binary tooling | **Исторический материал** до появления реальных `.PRE`/`.PRT`; не включать в web bundle | Образцы обеих версий, Turbo Pascal ABI | Очень высокий | P5 |
| `SANPROPA.PAS` | Главная программа, overlays и сценарии верхнего уровня | `app/main.ts` | Современный entrypoint существует | Сценарии — **reference**; Overlay/DOS bootstrap **не переносить** | Карта модулей | Низкий | P3 |
| `PRTABL.PAS` / `PRBOXS.PAS` / `PRNT.PAS` / `PROBA_PA.PAS` | DOS printing/reports | `persistence/` exports | CSV/SVG exports существуют | Состав отчётов — **reference**; printer API **не переносить** | Новые расчётные result types | Низкий | P4 |
| `SERV.PAS` / `KEY.PAS` / `MYGRAPH.PAS` / `HELPGR.PAS` / `SANP_SYS.PAS` | DOS UI, keyboard, Graph/Crt, help, sound/system setup | `ui/`, `rendering/` | Browser UI имеет собственные adapters | **Не переносить**; сохранить как исторический материал | Нет | Низкий | — |
| `AP1.PAS` / `AP11.PAS` / `PROBA.PAS` / `ELLIPS.PAS` / `TXT_HLP.PAS` / `PUTMENU.PAS` | Прототипы, проверки и вспомогательные программы | Tests/docs при наличии применимого поведения | Прямых аналогов нет | Классифицировать как **исторический материал**; отдельные сценарии использовать как reference только после подтверждения | Карта системы | Низкий/средний | — |
| `TOLS.PAS` / `TOOLS.PAS` | Идентичный исторический дубль расчётного/служебного фрагмента | Нет | Побайтная идентичность подтверждена манифестом | Один экземпляр использовать как **reference**, оба сохранить неизменными; в продукт **не переносить** | Нет | Низкий | — |

## Этап 1. Инерционные характеристики и диагностика balance

**Цель.** Первым implementation slice расширить существующий equipment balance:
считать центр тяжести, собственные моменты инерции поддерживаемых тел, переносить
их к общей точке по теореме Гюйгенса—Штейнера, суммировать симметричный тензор и
выдавать диагностические показатели крена/дифферента без заявления о полной
гидростатической устойчивости.

**Новые TypeScript-модули.** Предварительные имена, не калька с Pascal:
`src/modules/balance/inertia-model.ts`, `inertia.ts`, `inertia.test.ts` и при
необходимости `mass-properties.ts`.

**Изменяемые существующие модули.** `balance/model.ts` для result types,
`equipment/model.ts` только если потребуется явно заданный локальный tensor;
`projectState.ts` и persistence меняются лишь после стабилизации schema. UI на
первом pure slice не обязателен.

**Необходимые тесты.** Аналитические sphere/box/cylinder principal moments;
поворот оси цилиндра X/Y/Z; parallel-axis translation; симметрия и
неотрицательность диагонали tensor; permutation/translation invariants;
Body/NED signs для диагностических roll/pitch moments; invalid input results.

**Необходимые источники.** Учебник/стандарт по механике твёрдого тела;
определение tensor и parallel-axis theorem; соглашения SNAME о body axes;
`UDIFFER.PAS:Raschet_Udiffer` только как historical reference.

**Критерии приёмки.** Чистые immutable функции без DOM; единицы kg, m, kg·m²;
явная точка приведения; все tensor components документированы в Body/NED;
тесты не зависят от Pascal output; текущий equipment-only CB contract не изменён.

**Блокирующие вопросы.** Считать ли equipment однородными телами; нужны ли
плотность и пустотность; учитывать ли ориентации кроме главных осей; какая точка
является default reference; являются ли исторические `Jx/Jy/Jz/Jxy/...`
моментами или иной системой обозначений.

## Этап 2. Массовая модель

**Цель.** Отделить массу оборудования от корпуса, балласта, запасов и групп
нагрузок; получить design mass, CG и запас плавучести с прозрачным составом.

**Новые TypeScript-модули.** `balance/mass-model.ts`, `mass-groups.ts` и тесты.

**Изменяемые существующие модули.** `balance/model.ts`, `equipment-balance.ts`
через composition, `projectState.ts`, `project-json.ts` с новой версией схемы.

**Необходимые тесты.** Weighted CG по группам; включение/исключение items;
ballast cases; empty/invalid groups; mass budget; round-trip migration JSON.

**Необходимые источники.** Принятая проектная классификация масс и единиц;
правила учёта переменных запасов; `TABL.PAS`/`TYPE_PA.PAS` только как reference.

**Критерии приёмки.** Каждая масса имеет category, value, Body point и source;
aggregate воспроизводим; equipment остаётся владельцем геометрии оборудования;
balance владеет агрегацией; старые JSON проекты мигрируют однозначно.

**Блокирующие вопросы.** Набор mass groups; definition design condition;
представление распределённых масс; связь балласта с tank/fill state.

## Этап 3. Внешний герметичный объём и полный центр величины

**Цель.** Добавить отдельную модель watertight displaced volume и полный CB,
не подменяя ею текущий проницаемый обвод.

**Новые TypeScript-модули.** `geometry/watertight-volume.ts` для чистой геометрии
объёма; `balance/hull-buoyancy.ts` для плотности, силы и объединения buoyant
volumes; тесты каждого слоя.

**Изменяемые существующие модули.** `geometry/model.ts`, `balance/model.ts`,
`projectState.ts`, persistence; deprecated `center-of-buoyancy.ts` заменяется
только после доказанного нового контракта.

**Необходимые тесты.** Численная интеграция известных тел; convergence по
stations; ЦВК; symmetry; multiple sealed volumes; submerged/partially flooded
states; equipment-only и hull models не смешиваются неявно.

**Необходимые источники.** Hydrostatics references, watertight-envelope
definition, numerical integration error requirements.

**Критерии приёмки.** Явный discriminator buoyancy model; объём в m³ и CB в
Body/NED; корпус-обтекатель по умолчанию остаётся проницаемым; error bound
документирован; UI ясно называет выбранную модель.

**Блокирующие вопросы.** Какой объём герметичен; затопляемость; оболочка и
переборки; waterplane/fully submerged assumptions; требуемая точность.

## Этап 4. Сравнение проекта и прототипа

**Цель.** Ввести два типизированных snapshot без дублирования domain logic и
показывать объяснимые deltas.

**Новые TypeScript-модули.** `src/modules/comparison/model.ts`, `compare.ts` и
тесты либо соседний pure slice после архитектурного решения.

**Изменяемые существующие модули.** `projectState.ts`, `project-json.ts`; UI и
rendering только после стабилизации comparison result.

**Необходимые тесты.** Identical snapshots; missing fields; unit/coordinate
normalization; delta signs; JSON round-trip and migration.

**Необходимые источники.** Пользовательские сценарии и перечень сравниваемых
показателей; `BOXS.PAS`, `PRBOXS.PAS` как historical reference.

**Критерии приёмки.** Проект и прототип используют одну schema или явные
versioned schemas; comparison чистый; отсутствуют implicit coordinate casts;
результат содержит value, delta, unit и provenance.

**Блокирующие вопросы.** Прототип — измеренный аппарат или alternate design;
как хранить unknown values; допустимые tolerances; кто владеет baselines.

## Этап 5. Ходкость и энергетика

**Цель.** Реализовывать только после методической проверки современную модель
сопротивления, мощности и energy budget.

**Новые TypeScript-модули.** Отдельные pure slices `hydrodynamics/` и `energy/`
предпочтительнее помещения формул в geometry или UI.

**Изменяемые существующие модули.** Geometry предоставляет snapshot; project
state и persistence получают versioned inputs; rendering только визуализирует.

**Необходимые тесты.** Dimensional analysis; limiting cases; published
benchmarks; sensitivity; validity-range rejection; regression against an
approved dataset, а не только historical output.

**Необходимые источники.** Published naval-architecture methods с диапазонами
применимости; fluid properties; propulsion assumptions; validation dataset.

**Критерии приёмки.** Для каждой формулы указан источник и validity domain;
коэффициенты не являются magic numbers; units typed/documented; uncertainty
видима пользователю; `HODK.PAS` не используется как единственный oracle.

**Блокирующие вопросы.** Метод resistance prediction; Reynolds/Froude regimes;
appendages and propulsor; efficiency chain; required fidelity.

## Этап 6. Стоимость

**Цель.** Создать новую versioned cost model; исторические денежные коэффициенты
1996 года не считать актуальными.

**Новые TypeScript-модули.** Отдельный `cost/` slice с typed assumptions,
currency, price basis date, source и uncertainty.

**Изменяемые существующие модули.** Project state/persistence после утверждения
domain contract; UI только как consumer result.

**Необходимые тесты.** Currency/base-date validation; category aggregation;
scenario comparison; missing/escalated prices; deterministic rounding.

**Необходимые источники.** Актуальная cost breakdown structure, индексы,
правила валют и дата базы; `STOIMOST.PAS` — только reference структуры факторов.

**Критерии приёмки.** Каждый коэффициент имеет источник, валюту и дату;
historical coefficients отсутствуют в production defaults; output отделяет
estimate от known cost; uncertainty/coverage видимы.

**Блокирующие вопросы.** Цель оценки и уровень детализации; валюта; источник
цен; индексирование; коммерческая чувствительность данных.

## Сквозные правила реализации

1. Сначала pure domain contract и тесты, затем persistence/UI/rendering.
2. Pascal names остаются в traceability docs, но не становятся публичным API.
3. Legacy-coordinate conversion оформляется отдельной документированной
   функцией; вывод о знаках осей требует доказательства.
4. Все значения получают единицу, validity state и provenance.
5. Результаты исторической программы допустимы как regression clue, но не как
   единственный инженерный oracle.
