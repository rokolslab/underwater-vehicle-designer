[← Getting Started](getting-started.md) · [Back to README](../README.md) · [Calculations →](calculations.md)

# UI/UX Guide

Документ описывает текущую компоновку интерфейса, назначение панелей и ожидаемые пользовательские сценарии.

## Design Intent

Интерфейс рассчитан на инженерную работу, а не на landing page. Основные принципы:

- все рабочие области доступны на первом уровне страницы;
- данные ввода отделены от визуализаций и расчетных результатов;
- каждая область может быть свернута через `Показать / Скрыть`;
- экспортные кнопки расположены рядом с теми данными, которые они выгружают;
- предупреждения компоновки видны в строках оборудования и в 2D/3D-представлениях.

## Semantic UI Foundation

UX-1 вводит общий semantic status foundation без смены UI framework и без изменения расчетных контрактов.

Status vocabulary:

| Semantic status | Current use |
| --- | --- |
| `normal` | Нормальное состояние оборудования, успешный import, отсутствие предупреждений баланса |
| `warning` | Пересечение оборудования, migration notice, WebGL fallback, предупреждения баланса |
| `error` | Выход оборудования за корпус или некорректные данные оборудования |
| `experimental` | Маркер экспериментального equipment-only balance |
| `selected` | Token-only placeholder; selection state не реализован |
| `disabled` | Native `:disabled` styling для существующих controls |
| `stale` | Token-only placeholder; runtime stale state не реализован |
| `running` | Token-only placeholder; async phase state не реализован |

DOM presentation uses `data-ui-status="..."` and `ui-status--...` next to existing compatibility classes. Domain statuses are not renamed: equipment constraints still use `ok`, `intersects`, `outsideHull`, and `invalidEquipment`, mapped in the UI adapter as `ok -> normal`, `intersects -> warning`, `outsideHull -> error`, `invalidEquipment -> error`.

CSS tokens live in `src/app/styles.css`; the pure UI contract lives in `src/modules/ui/statusTokens.ts`. Canvas/Three.js adapters mirror the same semantic meanings through `src/modules/rendering/statusColors.ts` and must not import from `src/modules/ui/*` or read CSS custom properties at runtime.

Accessibility foundation in this increment:

- interactive actions and toggles are outside `<summary>` headers;
- repeated `Скачать SVG` buttons have contextual accessible names;
- equipment rows use deterministic safe accessibility IDs and preserve raw equipment IDs only in `data-equipment-id`;
- status and issue text are linked to equipment rows with `aria-describedby`;
- current canvas-like surfaces have local textual descriptions.

Non-goals for this increment: workbench shell redesign, equipment selection, CAD-lite viewport controls, mobile-specific flow, public hero redesign, framework change, formulas, `ProjectInputs`, JSON schema, and migrations.

## Design Assets

Локальный набор шрифтов для будущего визуального сравнения хранится в [`design-assets/fonts/`](../design-assets/fonts/README.md). Каталог содержит WOFF2-файлы с кириллицей, лицензии и справку по Onest, Manrope, Golos Text, Commissioner, IBM Plex Sans и IBM Plex Mono. Эти шрифты пока не подключены к сайту и не являются частью текущей дизайн-системы.

## Page Structure

Workbench теперь имеет явный desktop shell:

- верхняя project toolbar содержит JSON-сохранение, JSON-загрузку, `Сброс` и навигационные якоря по рабочим зонам;
- компактная инженерная сводка показывает размерения, режим, число станций, число объектов оборудования, severity компоновки и equipment-only balance status из текущей `ProjectEvaluationPublication`;
- параметры корпуса, viewport, оборудование, диагностика и экспорт/данные разделены как самостоятельные зоны первого уровня;
- SVG/CSV exports остаются рядом с теми представлениями, которые они сохраняют, а не переезжают в project toolbar.

Порядок рабочих зон и панелей на странице:

| Panel | Purpose |
| --- | --- |
| Project toolbar | JSON project operations, reset and anchors to workbench zones |
| Engineering summary | Compact read-only overview from current inputs/evaluation |
| `Размерения` | Основные параметры корпуса, метода и расчетных настроек |
| `Боковой вид` | 2D-профиль, сетка, точки, SVG export |
| `3D корпус` | Three.js-просмотр и сечения |
| `Оборудование` | Добавление и редактирование объектов внутри корпуса |
| `Баланс` | Масса, плавучесть, ЦТ, ЦВ и плечо |
| `Теоретический чертеж` | Судостроительные проекции корпуса |
| `Параметрические точки профиля` | Таблица станций и CSV export |

`Боковой вид` и `3D корпус` расположены рядом на широком экране. На узких экранах панели складываются в одну колонку.

## Размерения

Панель `Размерения` сгруппирована на три control cluster:

- `Геометрия корпуса`: `L`, `lambda`, `B`, `H`, число станций и `ЦВК`;
- `Метод и формула`: режим геометрии и текущая формула/traceability text;
- `Расчётные настройки`: плотность воды для equipment-only balance.

Project operations больше не дублируются внутри `Размерения`; они находятся в верхней toolbar. Все input/select IDs сохранены для текущего `src/modules/ui/controls.ts` и `src/app/main.ts` wiring.

Поля ввода:

| Field | Meaning | Constraints |
| --- | --- | --- |
| `Длина L` | Полная длина корпуса, м | `>= 0.1` |
| `Удлинение lambda = L / H` | Связь длины и высоты | `>= 0.1` |
| `Ширина B` | Максимальная ширина корпуса по Body Y | `>= 0.01` |
| `Высота H` | Максимальная высота корпуса по Body Z | `>= 0.01` |
| `Точек обвода` | Количество равных интервалов станций | `8..80` |
| `ЦВК, м` | Длина цилиндрической вставки | `0..L/2` |
| `Плотность воды, кг/м3` | Вход балансового расчета | `> 0`, default `1025` |

Связь `H = L / lambda` двунаправленная:

- если пользователь редактирует `lambda`, пересчитывается `H`;
- если пользователь редактирует `H`, пересчитывается `lambda`.

`B` редактируется независимо. В строке режима показывается пользовательское имя режима (`Базовая формула` или `Классическая методика`) и активная формула: базовая формула масштабирует один shape factor по `B/H`, классическая методика использует `MaxWl(B)`/`MaxBt(H)`.

## Боковой вид

Панель показывает проекцию Body XZ: экран вправо — `+X` (нос справа), экран вниз — `+Z`.

Controls:

| Control | Effect |
| --- | --- |
| `Сетка` | Показывает или скрывает сетку на canvas |
| `Точки обвода` | Показывает или скрывает станции/точки |
| `Скачать SVG` | Экспортирует текущий 2D-профиль |

Состояния оборудования с проблемами передаются в 2D-renderer, чтобы пользователь видел, где объект выходит за пределы или пересекается.

## 3D корпус

Панель построена на Three.js.

| Control | Values | Effect |
| --- | --- | --- |
| `Режим` | `Сплошной`, `Рентген` | Меняет прозрачность корпуса: обычный внешний вид или прозрачный корпус для компоновки |
| `Прозрачность` | `0.12..0.45` | Регулирует прозрачность корпуса |
| `Сечение` | `Нет`, `X`, `Плоскость` | Включает clipping/section view |
| `X` | число, м | Положение поперечного сечения |
| `Плоскость` | `XY`, `XZ` | Продольная секущая плоскость |
| `Смещение` | число, м | Смещение продольной плоскости |

Сечения доступны в обоих режимах отображения и задаются в Body: `X ∈ [-L/2,+L/2]`, плоскость `XY` означает `z = offset`, `XZ` — `y = offset`. Clipping сохраняет половины `x <= offset`, `z <= offset` или `y <= offset` соответственно; пределы offset используют `H/2` для `XY` и `B/2` для `XZ`. Оси в сцене подписаны: X — нос, Y — правый борт, Z — вниз.

При раскрытии свернутой панели приложение вызывает resize 3D-сцены, чтобы canvas получил актуальные размеры.

## Оборудование

Панель позволяет добавлять и редактировать объекты компоновки.

Общие поля:

| Field | Meaning |
| --- | --- |
| `Наименование` | Пользовательское имя объекта; может содержать пробелы |
| `Форма` | `Сфера`, `Цилиндр`, `Блок` |
| `Масса` | Масса в кг |
| `X`, `Y`, `Z` | Центр в Body/SNAME-NED: нос, правый борт, вниз |
| `Ось` | Главная ось цилиндра: `X`, `Y`, `Z` |
| `Р`, `Дл.`, `Lx`, `By`, `Hz` | Радиус/длина или размеры блока по Body X/Y/Z |

Status states:

| Status | Meaning |
| --- | --- |
| `Норма` | Объект валиден и не нарушает ограничения |
| `Вне корпуса` | Объект выходит за радиус или длину корпуса |
| `Пересечение` | Объект пересекается с другим объектом |
| `Ошибка данных` | Некорректные масса, размеры, имя или координаты |

Если пользователь нажимает `Добавить` в свернутой панели, панель автоматически раскрывается.

## Баланс

Блок отображает агрегаты по списку оборудования:

| Metric | Meaning |
| --- | --- |
| `Масса, кг` | Сумма масс валидного оборудования |
| `Вытесненный объем, м3` | Сумма вытесненных объемов оборудования |
| `Вес, Н` | `sum(m) * g` |
| `Плавучесть, Н` | `rho * g * sum(V)` |
| `Запас плавучести, Н` | `Плавучесть - Вес` |
| `ЦТ` | Центр тяжести по массам |
| `ЦВ` | Центр величины по вытесненным объемам |
| `deltaX`, `deltaY`, `BG` | Смещения ЦВ относительно ЦТ и `BG = CG.z - CB.z` |
| `Mx`, `My`, `Mz` | Моменты в Body/NED |

Предупреждения выводятся внизу панели. Текущий ЦВ рассчитан только по вытесненным объемам оборудования и не является ЦВ внешнего герметичного корпуса.

## Теоретический чертеж

Панель содержит отдельный canvas-лист с судостроительными проекциями:

- `Бок` — профиль корпуса с батоксами;
- `Полуширота` — вид сверху с ватерлиниями;
- `Корпус` — поперечные сечения относительно миделя;
- носовые и кормовые шпангоуты разделены по сторонам ДП.

Все проекции используют данные `TheoreticalDrawing`, построенные из общего `ProfileSnapshot`.

## Параметрические точки профиля

Таблица показывает станции:

| Column | Meaning |
| --- | --- |
| `N` | Номер точки |
| `s` | Параметрическая координата от носа `0` к корме `L` |
| `радиус верх` | Положительный радиус профиля |
| `радиус низ` | Отрицательный радиус профиля |

Кнопка `Скачать CSV` выгружает эту таблицу в формате с разделителем `;`.

## UX Rules for Future Work

- Не возвращать дублирующие расчетные метрики в верхнюю шапку, если эти значения уже заданы пользователем.
- Не помещать ввод оборудования рядом с 3D-сценой, если это уменьшает рабочую ширину строк.
- Не использовать англоязычные предупреждения в UI.
- Сохранять экспортные кнопки рядом с соответствующим представлением.
- Не превращать project toolbar в pseudo-CAD ribbon: она содержит только project operations и навигацию по существующим engineering surfaces.
- Не добавлять equipment selection, central diagnostics queue, camera presets, gizmo или pointer picking без отдельного плана и state contract.
- Проверять mobile layout: кнопки и текст не должны перекрывать соседние поля.

## See Also

- [Calculations](calculations.md) — как UI-значения превращаются в расчет.
- [Data and Export](data-and-export.md) — JSON/CSV/SVG форматы.
- [Architecture](architecture.md) — какие модули отвечают за UI.
