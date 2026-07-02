# План реализации: расчет баланса оборудования

Branch: feature/balance-calculations
Created: 2026-07-02

## Настройки
- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage
Milestone: "Рассчитать ЦТ, ЦВ и баланс"
Rationale: Эта веха использует уже реализованную модель оборудования и проверки размещения, чтобы показать расчет массы, вытеснения и плеч компоновки.

## Commit Plan
- **Commit 1** (после задач 1-3): `feat(balance): add equipment balance calculations`
- **Commit 2** (после задач 4-6): `feat(ui): surface balance metrics`
- **Commit 3** (после задач 7-8): `test: verify balance workflow`

## Задачи

### Phase 1: Расчетная модель
- [x] Task 1: Расширить `src/modules/balance/model.ts` типами для расчета баланса оборудования.
  - Ожидаемое поведение: добавить `EquipmentBalanceInput`, `EquipmentBalanceResult`, `BalanceWarning`, `BalanceMomentArm`, поля для массы, веса, вытесненного объема, силы плавучести, чистой плавучести, ЦТ, ЦВ и плеча `centerOfBuoyancy - centerOfGravity`.
  - Файлы: `src/modules/balance/model.ts`.
  - LOGGING REQUIREMENTS: type-only задача не добавляет runtime logging; будущие расчетные функции должны логировать вход, агрегаты и warning-коды.
  - Зависимости: нет.

- [x] Task 2: Реализовать чистый расчет баланса в `src/modules/balance/equipment-balance.ts`.
  - Ожидаемое поведение: считать ЦТ как `sum(m_i * p_i) / sum(m_i)`, ЦВ как `sum(V_i * p_i) / sum(V_i)`, вес как `mass * g`, плавучесть как `rho * g * displacedVolume`, чистую плавучесть как `buoyancyForce - weight`, плечи по `x/y/z`, warning-коды для пустого списка, невалидного оборудования, неположительной плотности/ускорения, отрицательной или нулевой плавучести и случая, когда ЦВ не выше ЦТ по `z`.
  - Файлы: `src/modules/balance/equipment-balance.ts`.
  - LOGGING REQUIREMENTS: `DEBUG` при старте/завершении расчета с count, density, gravity, mass, volume, netBuoyancy; `WARN` для каждого warning-кода; не логировать полный список оборудования.
  - Зависимости: Task 1.

- [x] Task 3: Добавить Vitest-регрессии для расчетной модели баланса.
  - Ожидаемое поведение: покрыть пустой список, один объект, два объекта с разными массами/объемами, override `displacedVolume`, невалидное оборудование, неположительную плотность и warning по `centerOfBuoyancy.z <= centerOfGravity.z`.
  - Файлы: `src/modules/balance/equipment-balance.test.ts`.
  - LOGGING REQUIREMENTS: тесты не зависят от реального `console`; assertions проверяют численные результаты и warning-коды, а не текст логов.
  - Зависимости: Task 2.

### Phase 2: Интеграция в приложение
- [x] Task 4: Добавить app-layer настройки расчета баланса и чтение плотности воды.
  - Ожидаемое поведение: добавить control для плотности воды с default `1025 kg/m^3`, нормализовать значение вне geometry-модуля, передавать настройки рядом с `ProjectState` без загрязнения `ProfileState`.
  - Файлы: `index.html`, `src/app/main.ts`, возможно `src/app/projectState.ts`.
  - LOGGING REQUIREMENTS: `DEBUG` при чтении/нормализации density; `WARN` при clamp/fallback невалидного значения; не логировать DOM или полный state.
  - Зависимости: Task 2.

- [x] Task 5: Показать расчетный блок баланса в UI.
  - Ожидаемое поведение: вывести суммарную массу, вытесненный объем, вес, плавучесть, чистую плавучесть, координаты ЦТ/ЦВ и плечо `B - G`; показать компактные предупреждения по warning-кодам.
  - Файлы: `index.html`, `src/modules/ui/metrics.ts`, `src/app/styles.css`, `src/app/main.ts`.
  - LOGGING REQUIREMENTS: `DEBUG` при render balance metrics с validity/warning count; UI-render не добавляет `WARN`, если расчет уже вернул warnings.
  - Зависимости: Task 4.

- [x] Task 6: Связать расчет баланса с текущим equipment workflow.
  - Ожидаемое поведение: `update()` пересчитывает баланс после constraints, передает только валидное app-state представление, не блокирует ввод при warning, reset очищает оборудование и возвращает расчет в пустое состояние.
  - Файлы: `src/app/main.ts`, `src/app/projectState.ts`.
  - LOGGING REQUIREMENTS: `DEBUG` в `update()` с equipmentCount, constraintIssueCount и balanceWarningCount; `ERROR` при неожиданном исключении balance calculation с кратким контекстом.
  - Зависимости: Task 5.

### Phase 3: Проверка и документация
- [x] Task 7: Обновить UI/app tests и контекстные документы.
  - Ожидаемое поведение: добавить тесты для render balance metrics/warnings; обновить `AGENTS.md` и `.ai-factory/DESCRIPTION.md`, если новые файлы balance/UI стали частью карты проекта.
  - Файлы: `src/modules/ui/metrics.test.ts` или существующий подход тестирования UI, `AGENTS.md`, `.ai-factory/DESCRIPTION.md`.
  - LOGGING REQUIREMENTS: тесты не проверяют runtime logs; документационный checkpoint фиксирует только фактические изменения структуры.
  - Зависимости: Task 6.

- [x] Task 8: Прогнать quality gates и закрыть roadmap-веху.
  - Ожидаемое поведение: выполнить `npm run test`, `npm run build`, `npm run check:encoding`; при успешном результате отметить roadmap-веху "Рассчитать ЦТ, ЦВ и баланс" завершенной с датой 2026-07-02.
  - Файлы: `.ai-factory/ROADMAP.md`.
  - LOGGING REQUIREMENTS: production code не получает временные `console.log`; итоговые проверки фиксируются в финальном summary, а не отдельным отчетом.
  - Зависимости: Tasks 1-7.

