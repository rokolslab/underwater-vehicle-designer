# Implementation Plan: ЦВ корпуса

Branch: feature/hull-center-of-buoyancy
Created: 2026-06-30

## Settings
- Testing: yes
- Logging: standard
- Docs: yes

## Roadmap Linkage
Milestone: "Рассчитать ЦТ, ЦВ и баланс"
Rationale: План реализует первый расчетный срез этой вехи: центр величины и вытесненный объем геометрического корпуса без оборудования и итогового баланса.

## Scope Decision
- ЦВ корпуса трактуется как центр геометрического вытесненного объема полностью погруженного тела вращения по текущему 2D-профилю.
- Корпусная масса, оборудование, частичное погружение, крен, дифферент и ЦТ не входят в этот план.
- Ветка является stacked-веткой поверх `feature/docker-development-environment`, потому что `master` еще не содержит Vite + TypeScript модульную структуру.

## Plan Improvement Notes
- Расчет должен жить в `balance`, а не в `geometry`, чтобы не нарушать границу: geometry строит профиль, balance считает производные инженерные величины.
- Для текущей формулы используем аналитический интеграл, а не численное суммирование станций: станции нужны для отображения, а не для точности объема.
- UI должен получать готовый расчет из app orchestration и не дублировать формулы в DOM-слое.
- Для невозможной геометрии расчет возвращает структурированный результат `isValid: false` с `reason`, а не скрыто исправляет вход.

## Tasks

### Phase 1: Balance Domain
- [x] Task 1: Добавить чистый модуль расчета ЦВ корпуса.
  - Deliverable: создать `src/modules/balance/center-of-buoyancy.ts` и при необходимости `src/modules/balance/model.ts`.
  - Behavior: функция принимает `length` и `diameter` текущего корпуса, возвращает `isValid`, вытесненный объем и центр `{ x, y, z }`; при `length <= 0` или `diameter <= 0` возвращает `isValid: false` и `reason`.
  - Formula: `volume = Math.PI * (0.972 * diameter) ** 2 * length / 8`; `center.x = 7 * length / 15`; `center.y = 0`; `center.z = 0`.
  - Logging: чистая функция не пишет в лог; интеграционный слой логирует входные параметры и итоговые значения на `debug`.
  - Files: `src/modules/balance/center-of-buoyancy.ts`, `src/modules/balance/model.ts`.

### Phase 2: Tests
- [x] Task 2: Покрыть расчет ЦВ корпуса Vitest-тестами.
  - Deliverable: добавить тесты для объема и координаты ЦВ при `L=6`, `D=2`, для масштабирования при изменении длины/диаметра и для invalid-входа.
  - Behavior: тесты проверяют аналитические значения с `toBeCloseTo`, симметрию `y=0`, `z=0`, отсутствие зависимости от числа станций и `isValid: false` для невозможной геометрии.
  - Logging: тесты не проверяют logger напрямую; в описаниях тестов фиксируются расчетные контракты.
  - Files: `src/modules/balance/center-of-buoyancy.test.ts`.

### Phase 3: UI Integration
- [x] Task 3: Интегрировать расчет ЦВ в app orchestration и метрики.
  - Deliverable: `src/app/main.ts` вычисляет ЦВ один раз на каждый `update`, передает результат в `renderMetrics`.
  - Behavior: UI показывает `Объем корпуса`, `x ЦВ корпуса`, сохраняя существующие метрики максимальной ординаты, высоты и `x max`; при invalid-результате показывает `0.0000` и пишет warning.
  - Logging: `main.ts` пишет `debug` с `length`, `diameter`, `volume`, `centerX` после успешного расчета и `warn` с `reason` при invalid-результате.
  - Files: `src/app/main.ts`, `src/modules/ui/metrics.ts`, `index.html`.

### Phase 4: Context And Verification
- [x] Task 4: Обновить AI/project context под новый balance-модуль.
  - Deliverable: обновить карту структуры и описание проекта только в части новой расчетной capability.
  - Behavior: roadmap-веху не отмечать завершенной, потому что ЦТ, оборудование, плавучесть, крен и дифферент еще не реализованы.
  - Logging: не требуется, это документационный/context task.
  - Files: `AGENTS.md`, `.ai-factory/DESCRIPTION.md`.

- [x] Task 5: Проверить реализацию через проектные команды.
  - Deliverable: выполнить тесты, production build и проверку кодировки.
  - Behavior: все команды должны проходить без regression; Docker остается предпочтительным окружением, но можно использовать npm напрямую, если Docker не нужен для скорости и результат воспроизводим.
  - Logging: при падении команды зафиксировать конкретный command/error в финальном ответе.
  - Commands: `docker compose run --rm app npm run test`; `docker compose run --rm app npm run build`; `docker compose run --rm app npm run check:encoding`.

## Commit Plan
- **Commit 1** (after tasks 1-5): "feat(balance): add hull center of buoyancy"
