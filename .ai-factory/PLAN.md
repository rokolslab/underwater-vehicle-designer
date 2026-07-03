# План реализации: JSON import/export проекта

Branch: master
Created: 2026-07-03

## Настройки
- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage
Milestone: "Добавить импорт/экспорт проекта"
Rationale: JSON-сохранение нужно для воспроизводимости параметров корпуса, оборудования, плотности воды, 3D-настроек и расчетного состояния между сессиями.

## Контекст

Нужно добавить сохранение и загрузку проекта как версиионированный JSON. Источник данных для экспорта — `ProjectState` из `src/app/projectState.ts`. Импорт должен валидировать и нормализовать входной JSON через существующие нормализаторы, не обходя правила `appState`, `equipment`, `balance` и `rendering`.

## Задачи

### Фаза 1: Persistence model
- [x] Task 1: Создать `src/modules/persistence/project-json.ts` с версией схемы, `buildProjectJson(projectState)` и `parseProjectJson(json)`. Покрыть профиль, оборудование, `scene3dSettings`, `balanceSettings`; возвращать структурированный результат `ok/error`. Logging: `logger.debug` на start/success и `logger.warn` на invalid JSON/schema.
- [x] Task 2: Добавить `src/modules/persistence/project-json.test.ts` на round-trip, нормализацию некорректных чисел и отказ от неподдерживаемой версии. Logging: тесты не логируют напрямую.

### Фаза 2: UI integration
- [x] Task 3: Добавить в `index.html` и стили кнопки `Сохранить проект` / `Загрузить проект` и скрытый file input для `.json`. Logging: не требуется, кроме app-level handlers.
- [x] Task 4: Добавить в `src/app/main.ts` export/import handlers: export через `download`, import через `FileReader`, запись значений обратно в inputs/scene controls/equipment/water density и полный `update`. Logging: `logger.info` для export/import success, `logger.warn` для user-facing import validation failure, `logger.error` для unexpected read errors.

### Фаза 3: Context and verification
- [x] Task 5: Обновить `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `AGENTS.md` с новым `project-json.ts` entrypoint и фактом JSON import/export. Logging: не требуется.
- [x] Task 6: Прогнать `npm run test`, `npm run build`, `npm run check:encoding` и browser smoke сохранения/загрузки. Logging: результаты указать в финальном ответе.

## Commit Plan

Один commit после проверки:
- `feat(persistence): add project json import export`