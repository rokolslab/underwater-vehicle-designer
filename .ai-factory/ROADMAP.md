# Дорожная карта проекта

> Underwater Vehicle Designer развивается как frontend-only инженерный инструмент для 2D/3D-геометрии корпуса, компоновки оборудования, проверяемых расчетов и экспорта. Актуальный порядок развития синхронизирован с `.ai-factory/RESEARCH.md`: сначала стабилизируется application state и расчетный граф, затем расширяется уже реализованная legacy geometry и добавляются mass properties, hydrostatics и будущие инженерные модули.

## Актуальный фокус

Следующая фаза: эволюционный архитектурный рефакторинг без big-bang rewrite. Текущее состояние кода уже содержит полезное functional core, `ProfileSnapshot`, Body/SNAME-NED, JSON v2, Three.js/Canvas adapters, оборудование, constraints, equipment-only balance и режим `legacy-dsnp-pa` с собственной расчетной формулой `MaxWl(B)`/`MaxBt(H)` и эллиптическими сечениями `B/H`. Главный риск дальнейшего развития не в отсутствии legacy-формулы, а в том, что DOM и JSON пока имеют разные normalization paths, import не заменяет состояние атомарно, а `main.ts` совмещает application controller, derived calculations и render orchestration.

## Вехи

- [x] **Закрепить data-integrity import/export**: добавить регрессии и исправить сохранение `gravityMPerS2`, уникальность equipment IDs после import и round-trip поведение без расширения функциональности.
- [ ] **Ввести канонический `ProjectInputs` и общий normalization pipeline**: разделить domain inputs, `ProjectViewState`, compatibility aliases и persistence DTO, чтобы DOM и JSON использовали одни pure normalizers.
- [ ] **Ввести `ProjectStore` и атомарный import workflow**: проводить изменения через application commands/reducer или эквивалентный единый API, перестав использовать DOM как источник истины.
- [ ] **Извлечь чистый `deriveProject()` и `ProjectEvaluation`**: централизованно получать geometry snapshot, theoretical drawing data, constraints, equipment balance и diagnostics для adapters и export.
- [ ] **Сократить `main.ts` до composition root**: вынести application controller, import orchestration и derived calculations, а широкие adapters (`scene3d`, `constraints`, drawing/export) разделять по ответственности только через проверяемые seams.
- [ ] **Обобщить геометрию сечений через `SectionShape`**: ввести единые pure operations для площади, containment и sampling, чтобы mesh, constraints, theoretical drawing и SVG не ветвились по `geometryMode`.
- [ ] **Расширить уже реализованную legacy DSNP_PA geometry**: довести текущий режим `legacy-dsnp-pa` дальше эллиптических `MaxWl(B)`/`MaxBt(H)` сечений: `Lcw`, `Priam`/`Kr`, rounded-rectangle sections, батоксы, ватерлинии и дополнительные регрессии без смешивания с текущей формулой `formula.xlsx`.
- [ ] **Разделить mass properties, hydrostatics и stability**: добавить группы масс, тензор инерции, watertight envelope и полный ЦВ корпуса с явным `BuoyancyModel`, не смешивая их с equipment-only displaced volume.
- [ ] **Ввести versioned comparison snapshots**: сравнивать проект и прототип через `DesignSnapshot`/`ProjectEvaluation` deltas по геометрии, массам, балансу и выбранным показателям.
- [ ] **Подготовить hydrodynamics и energy modules**: подтвердить методики, диапазоны применимости и эталонные данные до реализации сопротивления, движителя, power budget и solver для циклических зависимостей.
- [ ] **Определить границы cost model и legacy import**: исследовать стоимость 1990-х и `.PRE`/`.PRT` binary layout отдельно, не включая их в production defaults без fixtures, provenance и версии схемы.
- [ ] **Расширить export и провести release QA**: экспортировать расчетные блоки и чертежные данные из `ProjectEvaluation`, затем проверить desktop/mobile, 2D/3D, import/export, Docker production smoke и устойчивость к некорректному вводу.
- [x] **Собрать первичный 2D-прототип и AI Factory context**: реализовать базовый расчет профиля, canvas, таблицу, SVG/CSV и проектные AI-артефакты.
- [x] **Перейти на Vite + TypeScript с чистой расчетной геометрией**: вынести формулы, станции, регрессии `formula.xlsx`, ЦВК и UTF-8 checks в типизированные модули и тесты.
- [x] **Построить 3D/чертежную визуализацию корпуса**: добавить Three.js scene, exact elliptical rings, theoretical drawing, adapters координат и responsive public demo shell.
- [x] **Добавить оборудование, constraints и equipment-only balance**: поддержать оборудование, 2D/3D отображение, containment/intersection reports, CG/CB, плавучесть, моменты и предупреждения.
- [x] **Ввести JSON v2, Body/SNAME-NED и проектный import/export**: мигрировать координаты, сохранять профиль, оборудование, 3D и balance settings, экспортировать профиль, CSV и theoretical drawing SVG.
- [x] **Реализовать legacy DSNP_PA geometry mode с эллиптическими сечениями**: задокументировать legacy-систему, добавить `legacy-dsnp-pa`, отдельную расчетную формулу `MaxWl(B)`/`MaxBt(H)`, ширину `B`, высоту `H`, эллиптические downstream consumers и формульный UI contract.
- [x] **Подготовить Docker/public demo workflow**: добавить Docker/Compose окружение, production smoke notes, публичный demo layout, WebGL fallback и QA checklist.

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
| Построить 3D-представление корпуса на Three.js | 2026-07-01 |
| Добавить модель оборудования и размещение внутри корпуса | 2026-07-02 |
| Реализовать проверки ограничений размещения | 2026-07-02 |
| Рассчитать ЦТ, ЦВ и equipment-only balance | 2026-07-02 |
| Добавить импорт/экспорт проекта | 2026-07-03 |
| Добавить проектную документацию | 2026-07-03 |
| Перейти на Body/SNAME-NED и JSON v2 | 2026-07-11 |
| Формализовать наследие DSNP_PA как reference source | 2026-07-23 |
| Реализовать legacy DSNP_PA geometry mode | 2026-07-27 |
| Поддержать ширину `B`, высоту `H` и эллиптические сечения для обоих режимов | 2026-07-27 |
| Подготовить Public Demo v1 и responsive UI | 2026-07-27 |
