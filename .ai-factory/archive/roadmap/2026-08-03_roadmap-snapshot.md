# Roadmap Snapshot - 2026-08-03

Archived from: .ai-factory/ROADMAP.md

## Archived Milestones

- [x] **Ввести `ProjectStore` и атомарный import workflow** - проводить изменения через единый application API и заменять состояние проекта без использования DOM как промежуточного источника истины.
- [x] **Собрать первичный 2D-прототип обводов** - реализовать расчет профиля, canvas, таблицу станций и базовый SVG/CSV export.
- [x] **Настроить AI Factory context** - создать описание проекта, архитектурные правила, базовые правила и карту `AGENTS.md`.
- [x] **Восстановить и закрепить корректную русскую кодировку** - привести пользовательские тексты и проектные документы к UTF-8 и добавить автоматическую проверку.
- [x] **Перейти на Vite + TypeScript** - заменить плоский `index.html`/`script.js` типизированной модульной сборкой.
- [x] **Выделить расчетную геометрию в чистый модуль** - вынести формулу, станции, экстремумы и сечения из UI-кода в тестируемый geometry layer.
- [x] **Добавить регрессионные тесты по `formula.xlsx`** - зафиксировать численное совпадение ключевых расчетов с табличным источником.
- [x] **Реализовать ЦВК, цилиндрическую вставку корпуса** - добавить `Lcyl` внутри общей длины `L`, ограничение `Lcyl <= L / 2` и непрерывные переходы нос/вставка/корма.
- [x] **Построить интерактивное 3D-представление корпуса** - создать Three.js-просмотр на общем geometry snapshot с эллиптическими кольцами, X-Ray и Cutaway.
- [x] **Добавить модель оборудования и размещение внутри корпуса** - поддержать sphere, cylinder и box с координатами, массой, размерами и ориентацией по главным осям.
- [x] **Реализовать проверки ограничений размещения** - выявлять выход за placement envelope, пересечения и invalid equipment с согласованной индикацией в UI/2D/3D.
- [x] **Рассчитать equipment-only ЦТ, ЦВ и баланс** - показывать CG, CB по displaced volume оборудования, плавучесть, вес, плечи и stability diagnostics без заявления о полном ЦВ герметичного корпуса.
- [x] **Добавить persistence проекта и базовые exports** - сохранять и загружать versioned JSON, экспортировать профиль в CSV/SVG и теоретический чертеж в SVG.
- [x] **Закрепить координатный контракт Body/SNAME-NED** - централизовать domain coordinates, adapters для Canvas/Three.js и одностороннюю миграцию JSON v1 -> v2.
- [x] **Формализовать наследие DSNP_PA как reference source** - создать карту Pascal-системы, модель данных, каталог расчетов и integration roadmap без прямого переноса legacy-кода.
- [x] **Реализовать базовый legacy DSNP_PA geometry mode** - добавить `legacy-dsnp-pa`, регрессии `MaxWl(B)`/`MaxBt(H)`, размеры `B/H`, эллиптические downstream consumers и формульный UI contract.
- [x] **Подготовить Docker и Public Demo v1** - добавить воспроизводимое Docker/Compose окружение, responsive visualization-first UI, WebGL fallback, production smoke и QA checklist.
- [x] **Закрепить data-integrity import/export** - сохранить `gravityMPerS2`, исключить duplicate equipment IDs после import, проверить round-trip, перевести CSV в Body coordinates и добавить Playwright regressions.
