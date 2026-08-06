# Дорожная карта проекта

> Underwater Vehicle Designer развивается как frontend-only инженерный инструмент для 2D/3D-геометрии корпуса, компоновки оборудования, воспроизводимых расчетов и инженерного экспорта в едином координатном и application-state контракте.

## Актуальный фокус

Базовая визуализация, оборудование, equipment-only balance, JSON v2, Body/SNAME-NED, эллиптические режимы геометрии, data-integrity import/export, canonical `ProjectInputs`, `ProjectStore`, command/reducer layer, единый `deriveProject()`/`ProjectEvaluation` и `SectionShape` geometry seam уже реализованы.

Следующая фаза имеет два согласованных направления, которые могут развиваться без ложной полной блокировки друг друга:

- **Продуктовый/UI-трек:** начать с единой UI-системы, семантических статусов и ясного каркаса engineering workbench, затем связать оборудование, диагностику, CAD-lite viewport, mobile inspect/export и публичную MVP-презентацию на реальном демопроекте.
- **Инженерный трек:** продолжать развитие legacy geometry через `Priam`/`Kr` поверх `SectionShape`, сокращать `main.ts` до wiring через application/UI seams без big-bang переноса каталогов и добавлять новые расчётные capabilities отдельными pure modules.

Принятый продуктовый контекст: register — `Product`; основной продукт — инженерный workbench; публичный hero — secondary restrained brand surface; аудитория — инженеры и технические специалисты; стадия применения — эскизная и концептуальная проработка; характер — точный, инженерный, спокойный, технологичный. Продукт не заявляется как full CAD/CAE, а текущий equipment-only balance не называется полной гидростатикой. Body/SNAME-NED, русская операционная терминология и архитектурное правило «UI не является источником инженерной истины» сохраняются.

## Вехи

### Application foundation

- [x] **Ввести канонический `ProjectInputs` и общий normalization pipeline** — разделить domain inputs, `ProjectViewState`, compatibility aliases и persistence DTO, чтобы DOM и JSON использовали одни pure normalizers.
- [x] **Извлечь `deriveProject()` и сократить `main.ts` до composition root** — централизованно получать `ProjectEvaluation` для geometry, drawing, constraints, balance, diagnostics и export, оставив в entrypoint только wiring и subscriptions.
- [x] **Ввести command/reducer layer поверх `ProjectStore`** — направить canonical mutations через typed `ProjectCommand`, pure `reduceProject()` и `ProjectStore.dispatch()` без production render subscription.
- [x] **Обобщить геометрию сечений через `SectionShape`** — ввести единые pure operations для площади, containment и sampling контура, чтобы mesh, constraints, theoretical drawing, integration и export не ветвились по `geometryMode`.

### Развитие продукта и пользовательского интерфейса

Общий порядок продуктовых вех:

```text
1. UI-система и workbench shell
   ↓
2. Оборудование и диагностика
   ↓
3. CAD-lite 3D viewport
   ↓
4. Mobile inspect/export
   ↓
5. Public MVP presentation
```

Допустимая частичная параллельность: базовые camera presets и reset из третьей вехи можно планировать после первой; selection highlight и diagnostics overlays в 3D зависят от второй; канонический demo fixture можно готовить во время второй-третьей вех; финальные hero captures зависят от завершённого viewport; mobile реализуется после стабилизации desktop components, а не как отдельная UI-архитектура.

Общие продуктовые и визуальные решения для всех UI-вех:

- UI не становится источником инженерной истины: geometry, calculations и exports не дублируются в presentation layer.
- Смена UI-framework не входит в эти вехи без отдельного обоснования.
- Не менять расчётные формулы, JSON schema и `ProjectInputs` без предметной необходимости.
- Не добавлять псевдо-CAD controls, fake tools или claims, не подтверждённые текущими capabilities.
- Глобальная декоративная двухосная сетка удаляется с общего фона; сетка сохраняется внутри hero, 2D/3D viewport и инженерных чертежей.
- Equipment left accent сохраняется только как семантический status rail.
- `normal`, `warning`, `error`, `experimental`, `selected`, `disabled`, `stale`, `running` используют единые токены; selection показывается отдельно от инженерного статуса.
- Статус всегда дублируется текстом или значком; не добавлять глобальные detector ignores.
- Narrow ignore допустим только после реализации и подтверждения конкретного signature component.

- [ ] **Сформировать единую UI-систему и ясный каркас инженерного workbench** — пользователь за несколько секунд понимает, где изменить параметры корпуса, где увидеть результат, где находится оборудование, где отображаются предупреждения и где сохранить или экспортировать проект.

  Scope: semantic design tokens; статусы `normal`, `warning`, `error`, `experimental`, `selected`, `disabled`, `stale`, `running`; единые focus и selection states; доступные controls и mobile touch targets; исправление модели с интерактивными элементами внутри `<summary>`; верхняя project toolbar; компактный engineering summary; визуальное разделение параметров, viewport, оборудования, диагностики и экспорта; базовый desktop workbench shell; группировка параметров корпуса, метода, расчётных настроек и операций с проектом.

  Non-goals и ограничения: не менять framework только ради редизайна; не менять расчётные формулы; не менять `ProjectInputs` без предметной необходимости; не добавлять псевдо-CAD controls; не включать выбор оборудования и прямые манипуляции в первый инкремент этой вехи; сохранить текущие архитектурные границы, где UI не пересчитывает геометрию и не владеет инженерным состоянием.

  Рекомендуемая декомпозиция для будущего `aif-plan`: сначала semantic UI foundation, accessibility и status tokens; затем workbench shell и information architecture.

  Критерий завершения: интерфейс имеет единый визуальный и семантический язык; критичные действия не вложены в disclosure summaries; основной рабочий сценарий читается без последовательного просмотра всей страницы; engineering summary показывает актуальное состояние проекта; существующие расчётные и persistence contracts сохранены; релевантные Vitest, Playwright, encoding и build gates проходят.

- [ ] **Связать оборудование, инспектор и диагностику в единый рабочий сценарий** — пользователь может выбрать оборудование, увидеть его параметры во всех связанных представлениях и понять, какую проблему требуется исправить первой.

  Scope: intentional empty state; компактный список оборудования; inspector выбранного объекта; отдельный `WorkbenchInteractionState`; `selectedEquipmentId`; `hoveredEquipmentId`; синхронизация списка, inspector, diagnostic queue, 2D и 3D; центральная очередь диагностик; severity и стабильная навигация от проблемы к объекту; text-first warnings; семантический status rail оборудования; отдельный визуальный слой selection; подтверждение или безопасная модель удаления; mobile card representation оборудования.

  Принятое решение о состоянии: selection и hover не входят в `ProjectInputs`, `ProjectEvaluation` и project JSON; selection не создаёт dirty state, не входит в autosave проекта и не входит в инженерный Undo/Redo; изменение selection не запускает `deriveProject()`; после добавления выбирается новый объект; после импорта и reset selection очищается; после удаления выбранного объекта выбирается ближайший оставшийся объект либо показывается empty state.

  Non-goals и ограничения: не представлять equipment-only balance как полную гидростатику; не добавлять batch/CAD-like editing как условие этой вехи; не смешивать view-only selection с engineering commands.

  Рекомендуемая декомпозиция для будущего `aif-plan`: сначала equipment selection, interaction state и inspector; затем unified diagnostics, severity и issue navigation.

  Критерий завершения: один и тот же выбранный объект согласованно отображается в списке, inspector, 2D и 3D; диагностическая проблема ведёт к соответствующему объекту; статус понятен без использования одного только цвета; selection не загрязняет project state и persistence; equipment-only balance продолжает явно обозначаться как неполная гидростатика.

- [ ] **Развить 3D-представление до воспроизводимого CAD-lite viewport** — пользователь понимает, что именно показано в 3D, может воспроизвести рабочий ракурс, переключить представление и исследовать корпус и оборудование без ложного ожидания полноценного CAD.

  Scope: центральный переключаемый viewport; режимы `3D`, `Боковой вид`, `2D + 3D`; первый запуск в режиме `3D`; восстановление последнего локального предпочтения; автоматический fallback на 2D при недоступном WebGL; отсутствие active viewport mode в project JSON; отсутствие split view на недостаточной ширине; стандартные виды сбоку, сверху, спереди и изометрия; reset camera; fit model; видимый summary текущего режима и активного сечения; скрытие или блокировка зависимых controls при выключенном сечении; числовое значение opacity; русские interaction hints; keyboard/text equivalent для pointer-only взаимодействия; structured fallback content; selected equipment highlight; diagnostic overlays; reduced-motion behavior; WebGL unavailable state.

  Принятые desktop/mobile решения: на desktop при первом запуске открывается `3D`, затем используется последний режим из локальных пользовательских настроек; доступны `3D`, `Боковой вид` и `2D + 3D`; split view сначала имеет фиксированную пропорцию без обязательного draggable divider. На mobile доступны отдельные `3D` и `2D`; split view отсутствует.

  Non-goals и ограничения: не добавлять неработающие CAD-like инструменты; не сохранять active viewport mode в project JSON; не делать selection highlight и diagnostic overlays до selection contract предыдущей вехи.

  Рекомендуемая декомпозиция для будущего `aif-plan`: сначала reproducible 3D views, viewport controls и section state; затем selection highlight, diagnostics overlays и accessibility. Второй план зависит от selection contract предыдущей вехи.

  Критерий завершения: viewport имеет воспроизводимые виды; текущее состояние сцены и сечения понятно без анализа controls; 3D имеет клавиатурный или текстовый эквивалент; WebGL failure не блокирует работу с проектом; 2D остаётся полноценным инженерным представлением; не добавлены неработающие CAD-like инструменты.

- [ ] **Сформировать мобильный inspect/export flow с базовым редактированием** — технический пользователь может открыть проект на телефоне, понять его состояние, изменить основные данные, просмотреть 2D/3D, проверить оборудование и диагностику и выполнить импорт или экспорт.

  Принятое решение: mobile реализуется как `inspect/export-first` режим с базовым редактированием.

  Scope: короткий public hero; компактный summary проекта; изменение основных параметров корпуса; переключение 2D/3D; просмотр и формовое редактирование отдельного оборудования; диагностика; JSON import/export; SVG/CSV и другие поддерживаемые exports; карточное представление оборудования; понятный horizontal scroll теоретического чертежа; WebGL fallback; touch targets; reduced motion; отсутствие горизонтального document overflow.

  Non-goals и ограничения: mobile MVP не включает split view, массовое редактирование большого списка оборудования как основной сценарий, точные CAD-like манипуляции непосредственно в сцене, drag/resize/gizmo и полный desktop parity.

  Рекомендуемая декомпозиция для будущего `aif-plan`: один отдельный план после стабилизации workbench, equipment и viewport components.

  Критерий завершения: mobile flow остаётся инженерно честным; основные действия и diagnostics доступны; критичные данные не скрыты ради сокращения страницы; exports доступны рядом с соответствующими представлениями; мобильные Playwright и visual checks проходят на согласованных viewport sizes.

- [ ] **Обновить публичную презентацию MVP на основе воспроизводимого демопроекта** — посетитель быстро понимает, что продукт реально строит корпус, показывает оборудование внутри, проверяет компоновку и предоставляет инженерные представления и экспорт.

  Принятое решение по hero: hero остаётся статической, а не отдельной интерактивной Three.js-сценой; hero использует заменяемую последовательность из 1–3 статических кадров; все кадры получаются из одного канонического демонстрационного проекта; основной кадр показывает полупрозрачный или рассечённый корпус с насыщенной, но читаемой и валидной компоновкой оборудования; дополнительные кадры показывают внешнюю геометрию и сечение; кадры доказывают разные возможности, а не являются небольшими вариациями одного ракурса; состав, порядок, подписи, desktop/mobile assets и alt-тексты задаются декларативной конфигурацией; один и тот же демопроект можно открыть в workbench; камера и capture recipes являются служебными publication artifacts и не требуют добавления камеры в project JSON; автоматическая смена кадров не обязательна, а при наличии она медленная, останавливается после взаимодействия и отключается при reduced motion; mobile может использовать ручное переключение; hero не показывает фиктивные controls, несуществующие системы или неподдерживаемые инженерные claims.

  Scope: упрощённая proof hierarchy; один основной продуктовый тезис; capability strip; честное ограничение «не full CAD/CAE и не validated full hydrostatics»; обновлённый hero asset после завершения CAD-lite viewport; favicon и базовая metadata polish; release checklist для обновления hero assets; воспроизводимый capture workflow, предпочтительно через существующий Playwright; загрузка того же demo fixture в workbench.

  Non-goals и ограничения: не задерживать доступ к workbench; не добавлять интерактивную hero-сцену; не добавлять камеры в project JSON; не заявлять неподтверждённые инженерные возможности.

  Рекомендуемая декомпозиция для будущего `aif-plan`: один план после стабилизации equipment, diagnostics и CAD-lite viewport. Канонический демопроект можно готовить раньше как зависимый fixture, но финальные hero captures выполняются после завершения viewport.

  Критерий завершения: hero показывает реальный продукт и реальную компоновку; кадры воспроизводимы из versioned demo fixture; их можно заменить без перестройки hero markup; mobile и desktop assets корректно загружаются; hero не задерживает доступ к workbench; посетитель может открыть показанный демопроект; маркетинговые заявления соответствуют фактическим capabilities.

### Следующие инженерные возможности

- [ ] **Расширить legacy DSNP_PA geometry mode** — после `SectionShape` добавить и независимо проверить `Lcw`, rounded-rectangle сечения `Priam`/`Kr`, батоксы, ватерлинии и дополнительные regressions без смешивания с текущей формулой `formula.xlsx`.
- [ ] **Добавить mass properties и тензор инерции** — считать собственные моменты поддерживаемых тел, перенос к общей точке, суммарный тензор и roll/pitch diagnostics в Body/SNAME-NED.
- [ ] **Добавить массовую модель и группы нагрузок** — отделить оборудование от корпуса, балласта, запасов и других mass groups с воспроизводимыми design mass, CG, единицами и provenance.
- [ ] **Добавить `WatertightEnvelope` и полный ЦВ корпуса** — отделить equipment-only displacement от герметичного вытесняющего объема, ввести явный `BuoyancyModel` и считать объем/ЦВ с контрактом затопляемости и точности интегрирования.
- [ ] **Завершить engineering exports** — дополнить существующие JSON, profile CSV/SVG и theoretical drawing SVG экспортом координат сечений, таблицы оборудования и расчетных результатов из `ProjectEvaluation`, не читая данные из DOM.
- [ ] **Ввести сравнение проекта и прототипа** — поддержать два versioned `DesignSnapshot` и объяснимые deltas по геометрии, массам, балансу и выбранным показателям без неявных преобразований координат.

### Исследовательский backlog

- [ ] **Подтвердить методики hydrodynamics и propulsion** — выбрать источники, диапазоны применимости, единицы, uncertainty и эталонные данные для сопротивления и движителя до добавления production formulas.
- [ ] **Реализовать hydrodynamics и energy capabilities** — после методической проверки добавить отдельные pure modules для сопротивления, движителя и energy budget, используя явный solver при цикле power → storage mass → geometry/mass → resistance.
- [ ] **Определить современную cost model** — зафиксировать структуру стоимости, валюту, базовую дату, provenance и uncertainty без использования коэффициентов 1990-х как production defaults.
- [ ] **Исследовать legacy `.PRE`/`.PRT` import** — восстановить binary layout только по реальным fixtures и подтвержденному Turbo Pascal ABI; потенциальный importer держать отдельно от browser runtime и версионировать его output schema.

## Release gates

**QA release gate применяется к каждому публичному релизу и каждой новой инженерной capability.** Gate включает релевантные regression/unit/integration и Playwright tests, `npm run check:encoding`, `npm run test`, `npm run build`, согласованность 2D/3D/export и targeted desktop/mobile smoke при изменениях UI или rendering. Для новых формул обязательны источник методики, диапазон применимости и независимые fixtures; недоступный manual smoke фиксируется как blocker, а не считается автоматически пройденным.

Для продуктовых/UI-вех gate расширяется по мере релевантности изменения: Vitest и dependency-contract tests, Playwright functional flows, keyboard/focus smoke, отсутствие interactive descendants inside `summary`, mobile overflow и touch-target checks, reduced-motion checks, WebGL fallback, согласованность selection между list/2D/3D, текстовые эквиваленты статусов, encoding, build и targeted desktop/mobile manual smoke. Visual regression не является обязательным gate для старого интерфейса непосредственно перед редизайном; visual baselines становятся обязательными после утверждения соответствующей новой поверхности и стабильного layout.

## Завершено

| Веха | Дата |
| --- | --- |
| Собрать первичный 2D-прототип обводов | 2026-06-29 |
| Настроить AI Factory context | 2026-06-29 |
| Восстановить и закрепить корректную русскую кодировку | 2026-06-30 |
| Перейти на Vite + TypeScript | 2026-06-30 |
| Выделить расчетную геометрию в чистый модуль | 2026-06-30 |
| Добавить регрессионные тесты по `formula.xlsx` | 2026-06-30 |
| Реализовать ЦВК, цилиндрическую вставку корпуса | 2026-07-01 |
| Построить интерактивное 3D-представление корпуса | 2026-07-01 |
| Добавить модель оборудования и размещение внутри корпуса | 2026-07-02 |
| Реализовать проверки ограничений размещения | 2026-07-02 |
| Рассчитать equipment-only ЦТ, ЦВ и баланс | 2026-07-02 |
| Добавить persistence проекта и базовые exports | 2026-07-03 |
| Закрепить координатный контракт Body/SNAME-NED | 2026-07-11 |
| Формализовать наследие DSNP_PA как reference source | 2026-07-23 |
| Реализовать базовый legacy DSNP_PA geometry mode | 2026-07-27 |
| Подготовить Docker и Public Demo v1 | 2026-07-27 |
| Закрепить data-integrity import/export | 2026-08-03 |
| Ввести `ProjectStore` и атомарный import workflow | 2026-08-03 |
| Ввести канонический `ProjectInputs` и общий normalization pipeline | 2026-08-03 |
| Извлечь `deriveProject()` и единый `ProjectEvaluation` | 2026-08-03 |
| Ввести command/reducer layer поверх `ProjectStore` | 2026-08-03 |
| Обобщить геометрию сечений через `SectionShape` | 2026-08-05 |
