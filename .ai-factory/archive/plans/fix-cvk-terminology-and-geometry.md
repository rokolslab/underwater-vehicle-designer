---
archived: 2026-08-03
---

# План реализации: ЦВК как цилиндрическая вставка корпуса

Branch: master
Created: 2026-06-30

## Настройки

- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage

Milestone: "Реализовать цилиндрическую вставку корпуса"
Rationale: План исправляет терминологию и реализацию параметра `ЦВК`, который должен задавать длину цилиндрической вставки корпуса, а не центр величины.

## Контекст

Принятое проектное обозначение: `ЦВК` — цилиндрическая вставка корпуса, `ЦВ` — центр величины. Текущая реализация ошибочно использует `ЦВ` в UI, balance, rendering и тестах как расчет центра величины геометрического корпуса. Нужно сначала развести терминологию и убрать ложную связь с плавучестью корпуса, затем добавить параметр `cylindricalInsertLength` / `Lcyl` в поток `input -> appState -> geometry snapshot -> rendering/export/tests`.

## Задачи

### Фаза 1: Терминология и контекст

- [x] Task 1: Обновить проектные документы и AI Factory context под терминологию `ЦВК`/`ЦВ`.
  - Файлы: `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/ROADMAP.md`, `.ai-factory/rules/base.md`, `TECHNICAL_SPEC.md`.
  - Ожидаемое поведение: `ЦВК` везде означает цилиндрическую вставку корпуса; `ЦВ` остается только центром величины в разделе баланса.
  - Logging requirements: runtime logging не нужен; в итоговом выводе перечислить измененные контекстные файлы и зафиксировать новое словарное правило.
  - Зависимости: нет.

- [x] Task 2: Пометить старый план `feature-hull-center-of-buoyancy.md` как устаревший или ошибочный в рамках текущей терминологии.
  - Файлы: `.ai-factory/plans/feature-hull-center-of-buoyancy.md`.
  - Ожидаемое поведение: будущие агенты видят, что план не является источником требований для `ЦВК`; расчет центра величины должен возвращаться позже как отдельная задача баланса.
  - Logging requirements: runtime logging не нужен; в итоговом выводе явно указать, что артефакт не удалялся.
  - Зависимости: Task 1.

### Фаза 2: State и UI

- [x] Task 3: Добавить параметр `cylindricalInsertLength` в typed state и controls.
  - Файлы: `src/modules/geometry/model.ts`, `src/modules/ui/controls.ts`, `src/app/appState.ts`, `src/app/appState.test.ts`.
  - Ожидаемое поведение: UI читает `ЦВК, м`, нормализует значение как неотрицательную длину и сохраняет в `ProfileState`; default `0` сохраняет текущий профиль.
  - Logging requirements: оставить debug-log нормализованного app state, включив `cylindricalInsertLength`.
  - Зависимости: Task 1.

- [x] Task 4: Переделать HTML и метрики интерфейса под ввод `ЦВК`.
  - Файлы: `index.html`, `src/modules/ui/metrics.ts`, `src/app/main.ts`.
  - Ожидаемое поведение: поле `x ЦВ корпуса` исчезает из управления корпусом; появляется ввод `ЦВК, м`; расчетные метрики центра величины корпуса временно убираются из основного UI до отдельной задачи баланса.
  - Logging requirements: при invalid/clamped вводе использовать существующий app-state debug-log; дополнительных UI logs не добавлять.
  - Зависимости: Task 3.

### Фаза 3: Геометрия ЦВК

- [x] Task 5: Реализовать профиль корпуса с цилиндрической вставкой в `geometry`.
  - Файлы: `src/modules/geometry/profile.ts`, `src/modules/geometry/model.ts`, `src/modules/geometry/profile.test.ts`.
  - Ожидаемое поведение: при `Lcyl = 0` профиль совпадает с текущей формулой; при `Lcyl > 0` после `xMax` появляется участок постоянного максимального радиуса, итоговая длина равна `Ltotal = L + Lcyl`, нос/вставка/корма непрерывны.
  - Logging requirements: расчетные функции остаются чистыми без logging; диагностировать только через тесты.
  - Зависимости: Task 3.

- [x] Task 6: Обновить station/smooth points, extents и shared snapshot под `Ltotal`.
  - Файлы: `src/modules/geometry/profile.ts`, `src/modules/geometry/model.ts`, `src/modules/rendering/canvas2d.ts`, `src/modules/persistence/svg.ts`, `src/modules/persistence/csv.ts`.
  - Ожидаемое поведение: canvas, SVG, CSV и таблица используют общий `ProfileSnapshot` с полной длиной корпуса и не пересчитывают геометрию самостоятельно.
  - Logging requirements: оставить существующие canvas debug logs; при необходимости добавить debug поля `totalLength` и `cylindricalInsertLength`.
  - Зависимости: Task 5.

### Фаза 4: Удаление ошибочной реализации центра величины корпуса

- [x] Task 7: Убрать интеграцию `calculateHullCenterOfBuoyancy` из текущего 2D-конструктора.
  - Файлы: `src/app/main.ts`, `src/modules/rendering/canvas2d.ts`, `src/modules/ui/metrics.ts`.
  - Ожидаемое поведение: 2D-конструктор больше не рисует маркер `ЦВ` и не показывает расчет центра величины геометрического корпуса как часть ЦВК.
  - Logging requirements: удалить logs `hull buoyancy calculated/invalid`; не заменять их новыми logs, пока балансовая модель не реализована.
  - Зависимости: Task 4, Task 6.

- [x] Task 8: Пересмотреть модуль `balance` и его тесты.
  - Файлы: `src/modules/balance/center-of-buoyancy.ts`, `src/modules/balance/center-of-buoyancy.test.ts`, `src/modules/balance/model.ts`.
  - Ожидаемое поведение: либо удалить неиспользуемый расчет центра величины корпуса, либо оставить его как явно не подключенный experimental/internal модуль без UI-интеграции; тесты не должны закреплять неверную трактовку `ЦВК`.
  - Logging requirements: модуль balance остается чистым без DOM/canvas/logging side effects.
  - Зависимости: Task 7.

### Фаза 5: Проверка

- [x] Task 9: Обновить и запустить проверки.
  - Файлы: `package.json` scripts не менять без необходимости; затронутые тесты в `src/**/*.test.ts`.
  - Команды: `npm run test`, `npm run build`, `npm run check:encoding`.
  - Ожидаемое поведение: тесты подтверждают backward compatibility при `Lcyl = 0`, корректную вставку при `Lcyl > 0` и отсутствие старого UI-потока `x ЦВ корпуса`.
  - Logging requirements: в итоговом выводе зафиксировать pass/fail каждой команды и все warnings.
  - Зависимости: Task 1-8.

## Commit Plan

- Commit 1: `docs: clarify cvk and center of buoyancy terms`
  - Tasks: 1-2
- Commit 2: `feat: add cylindrical insert state and geometry`
  - Tasks: 3-6
- Commit 3: `refactor: remove hull buoyancy from cvk workflow`
  - Tasks: 7-9
