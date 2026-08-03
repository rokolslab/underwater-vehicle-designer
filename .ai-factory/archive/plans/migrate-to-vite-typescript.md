---
archived: 2026-08-03
---

# План реализации: перейти на Vite + TypeScript

Branch: master
Created: 2026-06-30

## Настройки
- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage
Milestone: "Перейти на Vite + TypeScript"
Rationale: План напрямую закрывает следующую roadmap-веху: заменить плоский `index.html`/`script.js` на сборку с типизированными модулями, сохранив текущую 2D-функциональность.

## Контекст

Текущая версия работает как статическая страница:
- `index.html` подключает `styles.css` и `script.js` напрямую.
- `script.js` содержит состояние формы, расчет радиуса, генерацию станций, canvas-отрисовку, таблицу координат и SVG/CSV export.
- `styles.css` содержит текущую раскладку и визуальный стиль.
- `scripts/check-encoding.mjs` уже проверяет UTF-8 и должен остаться рабочим после миграции.

Целевая структура задана в `.ai-factory/ARCHITECTURE.md`: `src/app`, `src/modules/geometry`, `src/modules/rendering`, `src/modules/persistence`, `src/modules/ui`, `src/shared`, `tests/fixtures`.

Scope этого плана ограничен миграцией инфраструктуры и переносом текущей 2D-функциональности. 3D, цилиндрическая вставка, оборудование и баланс не входят в этот шаг.

## Commit Plan
- **Commit 1** (after tasks 1-3): `build: add vite typescript foundation`
- **Commit 2** (after tasks 4-6): `refactor: move 2d profile logic into typed modules`
- **Commit 3** (after tasks 7-10): `test: cover migrated profile workflow`

## Задачи

### Фаза 1: Основа сборки
- [x] Task 1: Добавить Vite + TypeScript проектную основу.
  - Файлы: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `src/`, `src/shared/logger.ts`.
  - Ожидаемое поведение: появляются scripts `dev`, `build`, `preview`, `test`, `check:encoding`; TypeScript настроен строго, но без избыточной сложности для браузерного приложения; DOM-библиотеки доступны через `tsconfig.json`; lockfile фиксирует версии `vite`, `typescript` и `vitest`.
  - Logging requirements: runtime logging не добавлять в конфигурационные файлы; в реализации зафиксировать в итоговом выводе добавленные npm scripts и версию целевого toolchain.
  - Зависимости: нет.

- [x] Task 2: Перенести HTML entrypoint на Vite.
  - Файлы: `index.html`, `src/app/main.ts`.
  - Ожидаемое поведение: `index.html` больше не подключает `script.js`, а загружает `/src/app/main.ts`; `main.ts` импортирует `./styles.css`; существующая русская разметка, элементы управления, canvas, таблица и кнопки экспорта сохраняются.
  - Logging requirements: в `main.ts` использовать logger из `src/shared/logger.ts` с уровнями `debug/info/warn/error`, выключаемый через `import.meta.env.DEV` или явный уровень; логировать только старт приложения и ошибки инициализации.
  - Зависимости: Task 1.

- [x] Task 3: Перенести CSS без визуального регресса.
  - Файлы: `src/app/styles.css`, `index.html`, удалить или перестать использовать корневой `styles.css` после переноса.
  - Ожидаемое поведение: текущая раскладка, responsive breakpoints, canvas sizing, таблица и кнопки визуально сохраняются; в `index.html` нет старого `<link rel="stylesheet" href="styles.css">`.
  - Logging requirements: runtime logging не нужен; в итоговом выводе указать, какой CSS-файл стал основным entrypoint.
  - Зависимости: Task 2.

### Фаза 2: Типизированные модули 2D-профиля
- [x] Task 4: Выделить чистую расчетную геометрию.
  - Файлы: `src/modules/geometry/model.ts`, `src/modules/geometry/profile.ts`, `src/modules/geometry/sections.ts`, `src/shared/math.ts`.
  - Ожидаемое поведение: функции `radiusAt`, генерация smooth points, station points, extents и связь `D = L / lambda` перенесены из `script.js` в TypeScript без зависимости от DOM/canvas; Task 4 вводит единый immutable `ProfileSnapshot` для `state`, `smoothPoints`, `stationPoints` и `extents`, который дальше используют canvas, SVG, CSV, table и metrics; генерация станций сохраняет текущий контракт `0`, `halfStep`, внутренние станции, `length - halfStep`, `length` (при `stations = 20` получается 23 точки).
  - Logging requirements: расчетные функции остаются чистыми и не логируют; нормализация пользовательского ввода, clamp/round и `lastEdited`-синхронизация остаются в appState/UI helpers, а не внутри geometry.
  - Зависимости: Task 1.

- [x] Task 5: Перенести 2D canvas rendering в отдельный модуль.
  - Файлы: `src/modules/rendering/canvas2d.ts`, `src/modules/rendering/model.ts`.
  - Ожидаемое поведение: canvas-профиль сохраняет сетку, оси, заливку корпуса, верхний/нижний контур и точки станций; rendering получает единый `ProfileSnapshot` из geometry и не читает DOM.
  - Logging requirements: логировать `debug`-события только при включенном verbose/dev режиме: resize canvas, пустой/некорректный snapshot, ошибки получения 2D context.
  - Зависимости: Task 4.

- [x] Task 6: Перенести CSV/SVG export в persistence-модули.
  - Файлы: `src/modules/persistence/csv.ts`, `src/modules/persistence/svg.ts`, `src/modules/persistence/download.ts`.
  - Ожидаемое поведение: `airship-profile.svg` и `airship-profile.csv` остаются совместимыми по содержимому с текущей реализацией; SVG сохраняет профиль, ось и station markers; CSV сохраняет колонки `N;x;y_top;y_bottom`; оба export-модуля принимают тот же `ProfileSnapshot`, что и canvas/table.
  - Logging requirements: логировать `info` для старта download и `error` при ошибке генерации blob/link; не логировать большие SVG/CSV payload целиком.
  - Зависимости: Task 4.

### Фаза 3: UI orchestration и регрессия поведения
- [x] Task 7: Собрать UI слой поверх модулей.
  - Файлы: `src/modules/ui/controls.ts`, `src/modules/ui/table.ts`, `src/modules/ui/metrics.ts`, `src/app/appState.ts`, `src/app/main.ts`.
  - Ожидаемое поведение: inputs `length`, `slenderness`, `diameter`, `stations`, toggles `show-grid/show-points`, reset, resize, таблица и метрики работают как до миграции; `lastEdited`-логика для `D` и `lambda`, clamp значений, округление и `ru-RU` форматирование сохранены в UI/appState слое; UI строит и передает дальше единый `ProfileSnapshot`.
  - Logging requirements: логировать `debug` для пользовательских state transitions и `warn` для fallback-нормализации числового ввода; production verbosity должен отключаться без правки кода.
  - Зависимости: Tasks 4-6.

- [x] Task 8: Добавить Vitest regression tests для расчетной геометрии и экспорта.
  - Файлы: `src/modules/geometry/profile.test.ts`, `src/modules/persistence/csv.test.ts`, `src/modules/persistence/svg.test.ts`, `src/modules/ui/controls.test.ts` или `src/app/appState.test.ts`, при необходимости `tests/fixtures/`.
  - Ожидаемое поведение: тесты покрывают `radiusAt`, `makeStationPoints`, `getExtents`, связь `D = L / lambda`, CSV headers/rows и наличие ключевых SVG elements; добавлена регрессия по контрольным значениям из `formula.xlsx`/`formula.xls` через fixture или документированный экспорт fixture; `makeStationPoints` проверяет half-step/endpoints контракт; UI/appState tests покрывают `lastEdited`, clamp, reset/toggles/table/metrics data flow и `ru-RU` форматирование без зависимости от canvas rendering.
  - Logging requirements: тесты не должны зависеть от console output; при необходимости mock logger должен быть отключаемым.
  - Зависимости: Tasks 4 и 6.

- [x] Task 9: Обновить verification/documentation контекст после миграции.
  - Файлы: `scripts/check-encoding.mjs`, `.ai-factory/DESCRIPTION.md`, `AGENTS.md`, при необходимости `README.md` или `docs/`.
  - Ожидаемое поведение: encoding check явно включает `.ts` и `.tsx`, проходит по `src/**/*.ts` и `vite.config.ts`, expected UI strings перенесены с `script.js` на актуальные TypeScript/HTML-файлы, DESCRIPTION и AGENTS отражают Vite + TypeScript как текущий стек, команды запуска и проверки документированы.
  - Logging requirements: `scripts/check-encoding.mjs --verbose` должен продолжить выдавать структурированные `DEBUG/INFO/WARN/ERROR` сообщения; новые docs не требуют runtime logging.
  - Зависимости: Tasks 1-8.

- [x] Task 10: Удалить или явно вывести из runtime legacy entry files после переноса.
  - Файлы: `script.js`, `styles.css`, `index.html`, `src/app/main.ts`, `scripts/check-encoding.mjs`.
  - Ожидаемое поведение: после миграции не остается второго исполняемого пути через корневой `script.js`; если корневой `styles.css` удален, Vite entrypoint полностью берет стиль из `src/app/styles.css`; encoding check не ссылается на удаленные legacy-файлы.
  - Logging requirements: runtime logging не добавлять; в итоговом выводе реализации указать, какие legacy-файлы удалены или оставлены как неиспользуемые и почему.
  - Зависимости: Tasks 2, 3, 7, 9.
## Проверки

После реализации выполнить:
- `npm install` или эквивалентную установку зависимостей, если `node_modules` отсутствует.
- `npm run build`
- `npm test`
- `npm run check:encoding`
- `npm run preview -- --host 127.0.0.1` и smoke-test в браузере: изменение `L`, `lambda`, `D`, `stations`, toggles, reset, SVG export, CSV export.
- Проверить, что `rg "script.js|href=\"styles.css\"|src=\"script.js\"" index.html src scripts` не показывает старый runtime import.
