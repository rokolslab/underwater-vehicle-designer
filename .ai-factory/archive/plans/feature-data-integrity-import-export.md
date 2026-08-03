---
archived: 2026-08-03
---

# План реализации: Data-integrity import/export

Ветка: `feature/data-integrity-import-export`
Создан: 2026-08-03

## Original Request

Закрепить data-integrity import/export: добавить регрессии и исправить сохранение gravityMPerS2, уникальность equipment IDs после import и round-trip поведение

## Настройки

- Testing: yes
- Logging: verbose
- Docs: yes

## Связь с roadmap

Веха: "Закрепить data-integrity import/export"
Обоснование: план напрямую закрывает потерю `gravityMPerS2`, коллизии equipment IDs и нестабильный round-trip, перечисленные в первой незавершённой вехе.

## Research Context

Source: `.ai-factory/RESEARCH.md` (Active Summary, Updated: 2026-07-31 09:58, SHA256: `9d61b3b0f54229e0ac4de813304ea3176e375049a1c3b60a455a33749d70e704`)

Цель: Закрепить data-integrity import/export до архитектурного рефакторинга.

Ограничения:
- Рефакторинг должен быть поэтапным, без big-bang rewrite и без нарушения JSON migrations.

Подтверждённые проблемы:
- После импорта возможен duplicate equipment ID из-за несинхронизированного ID generator.
- Импортированное `gravityMPerS2` теряется: application layer заменяет его default-константой.

Сигналы успеха:
- Import → add equipment сохраняет уникальность ID; import → export сохраняет gravity.

## Границы решения

- Сохранить JSON `schemaVersion: 2`: `gravityMPerS2` уже входит в `BalanceSettings` и persistence DTO.
- Не добавлять UI control для gravity; импортированное значение остаётся скрытой настройкой проекта и сбрасывается только общим reset.
- Не начинать `ProjectStore`, reducer, атомарный import или объединение DOM/JSON normalizers: это следующие roadmap-вехи.
- Не менять equipment IDs, уникальные после существующей `readString` trim/fallback-нормализации; исправлять только конфликтующий ID детерминированным свободным suffix.
- Удалить зависимость новых IDs от process-global counter: текущий equipment list должен быть единственным источником занятых ID.
- Collection uniqueness гарантируется `addEquipmentItem()` для уже уникального входного списка; ранее существующие duplicate IDs исправляются только на import normalization boundary.

## Критерии приёмки

- Импорт v2 с нестандартным положительным `gravityMPerS2` сохраняет это значение после application update, export и повторного import.
- Общий reset возвращает gravity к `DEFAULT_GRAVITY_M_PER_S2`.
- Любой успешно нормализованный импорт имеет уникальные equipment IDs, включая конфликт с уже занятым suffix.
- После импорта проекта с `equipment-1` следующее добавление получает свободный ID и не меняет импортированный объект.
- Нормализованный import → export → import стабилен: второй import не переименовывает IDs и не создаёт новых duplicate-ID warnings.
- JSON v1 migration, coordinate marker, profile/scene settings и существующие валидные IDs сохраняют текущее поведение.

## План коммитов

- **Коммит 1** (после задач 1-4): `fix: preserve project data integrity across import export`
- **Коммит 2** (после задачи 5): `docs: document project round-trip guarantees`

## Задачи

### Фаза 1: Зафиксировать регрессии

- [x] **Задача 1: Расширить persistence-регрессии для canonical round-trip и import → add.** В `src/modules/persistence/project-json.test.ts` на clone существующего v2 fixture проверить конфликт `payload`, `payload-3`, `payload` с точным canonical результатом `payload`, `payload-3`, `payload-4`, уникальностью ID и стабильностью `parse → build → parse`. Первый parse должен вернуть ровно один duplicate-ID normalization warning и один matching logger event с payload `{ requestedId: "payload", normalizedId: "payload-4" }`; после export parsed project повторный parse должен вернуть `warnings: []`, сохранить весь canonical `project` и не переименовывать ID. Сравнивать `project`, а не меняющийся `exportedAt`. Явно проверить `gravityMPerS2: 9.81` после первого parse, в raw exported JSON и после повторного parse, отметив, что это persistence-половина регрессии, а application workflow покрывает задача 4. В этом же integration test заменить ID fixture на `equipment-1`, вызвать `addEquipmentItem(parsed.project.equipment)` и проверить новую уникальность, неизменность импортированного ID и identity `next[0] === parsed.project.equipment[0]`. Fixture не изменять. Logging: перехватить `console.warn` только вокруг duplicate normalization, отличать `ProjectJsonParseResult.warnings` от logger events и не считать дополнительные browser-level WARN частью этого контракта. Файлы: `src/modules/persistence/project-json.test.ts`.

- [x] **Задача 2: Добавить unit-регрессии collection-level уникальности equipment IDs.** В `src/modules/equipment/placement.test.ts` зафиксировать default allocation для пустого списка, последовательных add, gaps (`equipment-1`, `equipment-3` → `equipment-2`), delete/reuse и двух независимых ветвей от `[]`, каждая из которых начинается с `equipment-1`. Проверить, что standalone `createDefaultEquipmentItem()` не влияет на последующий collection add; custom `idFactory` вызывается ровно один раз, свободный ID сохраняется, collision разрешается установленным suffix contract, а blank/whitespace result переключается на default allocation. Подтвердить неизменность входного массива, identity существующих объектов и `new Set(ids).size === items.length` при предусловии уникального input. Cross-module `parse → add` оставить в задаче 1, а этот файл сохранить unit-level. Logging: не добавлять вывод из тестов и не проверять внутренний pure allocator; при необходимости проверять только существующий DEBUG event публичного add boundary. Файл: `src/modules/equipment/placement.test.ts`. Задачи 1 и 2 логически независимы и могут выполняться параллельно.

### Фаза 2: Исправить data-integrity

- [x] **Задача 3: Сделать allocation equipment ID stateless и collision-safe.** В `src/modules/equipment/placement.ts` удалить module-level `nextGeneratedId` и выделить pure `allocateUniqueEquipmentId(requestedId, occupiedIds, preferredSuffix)`: requested ID считать opaque; свободный ID сохранять; при collision начинать с `max(2, preferredSuffix)` и последовательно увеличивать suffix до первого свободного. Для default add отдельно выбирать минимальный положительный `N`, для которого точный `equipment-N` отсутствует; для custom add вызывать `idFactory` ровно один раз, использовать `items.length + 1` как preferred suffix, а blank/whitespace result направлять в default allocation. `createDefaultEquipmentItem()` без коллекции должен возвращать локальный `equipment-1`, не хранить историю и не обещать collection uniqueness. В `src/modules/persistence/project-json.ts` сохранить текущую `readString` trim/fallback-семантику, затем применять allocator с `index + 1` как preferred suffix; `buildProjectJson()` не превращать во второй normalization boundary. Сохранить публичные сигнатуры, порядок и identity существующих элементов, не вводить persisted counter. Logging: pure allocator не логирует; существующий add boundary пишет DEBUG с выбранным ID и количеством занятых ID; persistence boundary пишет один WARN при фактическом rename с `requestedId` и `normalizedId`, без полного payload. Файлы: `src/modules/equipment/placement.ts`, `src/modules/persistence/project-json.ts`. Зависимости: задачи 1 и 2 должны падать до исправления и обе блокируют эту задачу.

- [x] **Задача 4: Сохранить imported gravity через тестируемый application seam.** В существующем `AppStateController` (`src/app/appState.ts`) хранить hidden scalar `currentGravityMPerS2`, инициализированный `DEFAULT_GRAVITY_M_PER_S2`; добавить методы `applyImportedGravityMPerS2(gravityMPerS2)` и `makeCurrentBalanceSettings(waterDensityKgPerM3)`, а общий `reset()` должен возвращать scalar к default. В `src/app/main.ts` применять imported gravity до `update("height")`, собирать `BalanceSettings` только через controller и после update логировать фактическое `currentProjectState.balanceSettings.gravityMPerS2`. Добавить browser-free `src/app/application-gravity.test.ts` на существующих structural control stubs с исполняемой цепочкой `parseProjectJson → applyImportedGravityMPerS2 → readState/makeProjectState → unrelated update → buildProjectJson → parseProjectJson → reset → buildProjectJson`; проверить сохранение отличимого `9.81`, отсутствие warnings после round-trip и возврат `9.80665` после reset. В `src/app/dom-contract.test.ts` оставить узкую composition-проверку: application method вызывается до `update("height")`, update использует `makeCurrentBalanceSettings()`, export использует `currentProjectState`, reset вызывает `appState.reset()` до update. `src/app/projectState.ts` остаётся stateless и только добавляет gravity в существующий DEBUG context. Не добавлять новый store/controller или DOM dependency. Logging: DEBUG при применении gravity и сборке state; INFO после import содержит значение из фактически собранного state, не входной payload целиком. Файлы: `src/app/appState.ts`, `src/app/main.ts`, `src/app/projectState.ts`, `src/app/application-gravity.test.ts`, `src/app/dom-contract.test.ts`. Зависимость: задача 1 фиксирует persistence contract; задача 3 независимо закрывает import → add uniqueness.

<!-- Commit checkpoint: tasks 1-4 -->

### Фаза 3: Документация и проверка

- [x] **Задача 5: Выполнить обязательный docs checkpoint и end-to-end проверку.** Через `/aif-docs` обновить `docs/data-and-export.md`: явно описать persistence `waterDensityKgPerM3`/`gravityMPerS2`, гарантию уникальности после import и add, а также collision-safe suffix без обещания единственной попытки `-index`. В `docs/testing.md` закрепить automated regressions и manual smoke: импорт fixture с gravity `9.81`, добавление оборудования, export, проверка gravity/уникальных ID и повторный import без новых предупреждений. Запустить `docker compose run --rm app npm run test`, `docker compose run --rm app npm run build` и `docker compose run --rm app npm run check:encoding`; затем выполнить browser smoke для import → add → export → import. Logging: production logging не менять; при smoke проверить DEBUG/INFO/WARN события import, ID normalization и export, не добавляя временных логов или отчётных файлов. Файлы: `docs/data-and-export.md`, `docs/testing.md`; roadmap отмечать завершённым только после успешной реализации и verify. Зависимости: задачи 1-4.

<!-- Commit checkpoint: task 5 -->

## Риски и контроль

- Global counter мог скрывать зависимость тестов от порядка выполнения; stateless allocator должен сделать результат зависимым только от переданного списка.
- Изменение suffix policy не должно переименовывать уже уникальные persisted IDs; регрессия сравнивает canonical project целиком после второго import.
- Gravity не имеет отдельного UI control, поэтому existing `AppStateController` временно владеет hidden scalar; behavioral app test защищает lifecycle, а узкий source-level wiring test не подменяет исполняемую регрессию.
- `createDefaultEquipmentItem()` без коллекции не может гарантировать collection uniqueness; production add должен проходить через `addEquipmentItem()`, а контракт standalone factory остаётся локальным созданием объекта.
