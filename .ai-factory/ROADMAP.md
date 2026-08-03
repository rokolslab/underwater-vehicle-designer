# Дорожная карта проекта

> Underwater Vehicle Designer развивается как frontend-only инженерный инструмент для 2D/3D-геометрии корпуса, компоновки оборудования, воспроизводимых расчетов и инженерного экспорта в едином координатном и application-state контракте.

## Актуальный фокус

Базовая визуализация, оборудование, equipment-only balance, JSON v2, Body/SNAME-NED, эллиптические режимы геометрии и data-integrity import/export уже реализованы. Следующая фаза — эволюционно ввести канонический application state и единый расчетный граф; только после этого расширять legacy geometry и добавлять новые инженерные модели.

## Вехи

### Application foundation

- [ ] **Ввести канонический `ProjectInputs` и общий normalization pipeline** — разделить domain inputs, `ProjectViewState`, compatibility aliases и persistence DTO, чтобы DOM и JSON использовали одни pure normalizers.
- [ ] **Извлечь `deriveProject()` и сократить `main.ts` до composition root** — централизованно получать `ProjectEvaluation` для geometry, drawing, constraints, balance, diagnostics и export, оставив в entrypoint только wiring и subscriptions.
- [ ] **Обобщить геометрию сечений через `SectionShape`** — ввести единые pure operations для площади, containment и sampling контура, чтобы mesh, constraints, theoretical drawing, integration и export не ветвились по `geometryMode`.

### Следующие возможности

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
