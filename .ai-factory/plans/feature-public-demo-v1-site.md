# План реализации: Public Demo v1 сайта

Branch: feature/public-demo-v1-site
Created: 2026-07-27

## Original Request

roadmap имеет большие планы, мне нужно приостановить проект так, чтобы можно было сделать сайт из готового материала, все что будет на сайте должно работать правильно, остальное можно дополнять по мере свободного времени. Помоги выбрать точку остановки и создания внешнего сайта с материалами проекта. Основа сайта - это визуализация, она должна работать одинакво хорошо на ПК и смартфонах, дополнительно нужна короткая описательная часть.

пиши full план

## Цель

Стабилизировать текущий Underwater Vehicle Designer как публичный демо-сайт `Public Demo v1`: визуализация корпуса должна быть главным продуктовым ядром, одинаково надежно работать на ПК и смартфонах, а описательная часть должна коротко и честно объяснять возможности и ограничения проекта.

## Точка остановки

Остановить развитие новых инженерных возможностей до публикации сайта. Для `Public Demo v1` считать готовым только то, что уже реализовано и может быть проверено: 2D/3D-визуализация, режимы геометрии, ввод `L/B/H/lambda/ЦВК`, эллиптические сечения, базовая компоновка оборудования, баланс как дополнительный блок, импорт/экспорт и теоретический чертеж.

Все остальные направления roadmap остаются backlog/follow-up: полный ЦВ герметичного корпуса, инерция, массовые группы, ходкость, энергетика, legacy `Priam`/`Kr`, стоимость и расширенный импорт.

## Scope

Включено:

- Сформировать публичный UX вокруг визуализации: короткий hero/описание и видимый demo-first layout.
- Проверить и поправить responsive layout для desktop/tablet/mobile, особенно 2D canvas, 3D scene, controls, equipment rows, theoretical drawing и таблицы.
- Улучшить надежность resize/re-render при изменении размеров viewport и раскрытии `<details>` панелей.
- Добавить понятный fallback/сообщение для 3D, если WebGL/Three.js не стартует.
- Зафиксировать краткий текст возможностей и ограничений прототипа на сайте и в docs.
- Подготовить production/mobile smoke checklist и выполнить финальные проверки.

Не включено:

- Новые расчетные модели корпуса, инерции, ходкости, энергетики или стоимости.
- Новые форматы legacy-импорта.
- Большая переработка архитектуры UI на framework/components.
- Полноценный CAD-like mobile editor оборудования.
- Автоматический deploy на конкретный домен, TLS и reverse proxy, если окружение не задано отдельно.

## Настройки

- Testing: yes
- Logging: standard; использовать существующий `logger`, добавлять `debug/info` только для новых lifecycle/fallback событий и `warn` для recoverable проблем.
- Docs: yes

## Roadmap Linkage

Milestone: "Провести финальную QA-проверку интерфейса и расчетов"

Rationale: `Public Demo v1` является практической точкой остановки перед продолжением больших roadmap-задач: он проверяет текущий интерфейс, визуализацию, адаптивность и корректность доступных возможностей.

## Архитектурные решения

1. Главный публичный продукт v1 — визуализация корпуса, а не полный инженерный CAD/баланс.
2. Изменения должны быть минимальными и использовать текущий Vite/TypeScript/Canvas/Three.js stack без нового UI framework.
3. `ProfileSnapshot` остается источником геометрии для всех визуализаций и export.
4. Mobile fixes должны в первую очередь идти через `src/app/styles.css`, точечно через `src/app/main.ts` и существующие rendering modules.
5. Для внешнего сайта допустима короткая landing-секция внутри текущего SPA, если она не ломает инженерный рабочий экран.
6. Публичный текст обязан явно называть проект прототипом/демо и не обещать неготовые roadmap-функции.

## Риски

- `master` локально может быть впереди `origin/master`; перед публикацией нужно убедиться, что remote содержит предыдущую feature-работу.
- `gh` отсутствует в текущем окружении, а HTTPS push требует credentials; remote merge/push может потребовать ручной авторизации.
- 3D на смартфонах зависит от WebGL, GPU и browser; нужен visible fallback.
- `touch-action: none` у 3D может конфликтовать с прокруткой страницы на mobile.
- `theoretical drawing` имеет широкий судостроительный лист и может быть плохо читаемым на узких экранах без scroll/adaptive shell.
- Download через Blob/`<a download>` может вести себя по-разному в iOS Safari и Android Chrome.
- Vite build уже предупреждает о chunk size; это не blocker, но для публичного сайта может стать future optimization.

## Задачи

### Фаза 1: Freeze scope и публичная упаковка

- [x] Task 1: Зафиксировать `Public Demo v1` scope в `README.md` и/или `docs/getting-started.md`: визуализация как основа сайта, текущие рабочие возможности, явные ограничения прототипа и backlog после остановки. Не менять расчетную логику. Logging: не требуется.

- [x] Task 2: Обновить верхнюю часть `index.html` и связанные стили в `src/app/styles.css`, чтобы первый экран работал как короткий landing/demo entry: понятный заголовок, 2-3 предложения описания, акцент на запуске визуализации и отсутствие длинного маркетингового текста. Сохранить существующие DOM id и bindings; если добавляются новые интерактивные или fallback DOM-элементы, закрепить их в `src/app/dom-contract.test.ts`. Logging: не требуется.

- [x] Task 3: Проверить default demo state и видимость ключевых controls (`L`, `B`, `H`, `lambda`, `ЦВК`, geometry mode, formula display) в `index.html`, `src/app/main.ts`, `src/app/appState.ts`. Если нужны изменения defaults, сохранить совместимость `B=H` с regression fixtures. Logging: использовать существующий `app state normalized`; новые warnings не добавлять без real normalization.

### Фаза 2: Responsive visualization ядро

- [x] Task 4: Провести responsive CSS pass в `src/app/styles.css`: desktop/tablet/mobile layout для `.visualization-panels`, `.control-grid`, `.scene3d`, `#profile-canvas`, `.equipment-row`, `.table-wrap`, `.panel-summary` и action buttons. Перед добавлением новых overrides свести или удалить устаревшие конфликтующие layout/media правила, чтобы не наращивать каскад поверх дублирующихся `@media`. Особое внимание: `360px..430px` ширина, отсутствие нежелательного горизонтального overflow, читаемые controls. Logging: не требуется.

- [x] Task 5: Исправить mobile layout оборудования в `src/app/styles.css` и при необходимости `src/modules/ui/equipment.ts`: на узких экранах status/delete/actions не должны занимать несуществующие grid columns и не должны перекрывать inputs. Сохранить desktop layout. Logging: не требуется.

- [ ] Task 6: Усилить resize/re-render lifecycle в `src/app/main.ts`: при `window.resize`, раскрытии `<details>` и изменении размеров контейнеров 2D canvas, 3D scene и theoretical drawing должны получать актуальный размер. Реализовать единый `scheduleRenderResize()` через `requestAnimationFrame`, рассмотреть `ResizeObserver` для containers 2D/3D/theoretical drawing без добавления зависимости, перерисовывать все три визуализации при раскрытии `<details>` и отключать observer при `beforeunload`/dispose. Logging: `debug` при lifecycle resize только если это уже согласуется с existing logger style; не логировать каждый frame.

- [ ] Task 7: Проверить 3D touch UX в `src/modules/rendering/scene3d.ts` и `src/app/styles.css`: drag в 3D должен работать, страница должна оставаться прокручиваемой вне сцены, wheel/drag behavior на desktop не должен регрессировать. Отдельно проверить текущий конфликт `.scene3d { touch-action: none; }`: изменить CSS/pointer handling так, чтобы drag по сцене оставался рабочим, но вертикальный scroll страницы не блокировался бесконечно; проверить `pointercancel`. Если меняется pointer/touch handling, добавить targeted tests там, где это возможно без browser-only harness. Logging: `warn` только для recoverable pointer/WebGL проблем.

- [ ] Task 8: Сделать theoretical drawing безопасным на mobile: минимум горизонтальный scroll/readable shell в `src/app/styles.css`; при необходимости точечная адаптация `src/modules/rendering/theoretical-drawing.ts` без переписывания чистой геометрии. SVG export contract не ломать. Logging: не требуется.

### Фаза 3: Надежность публичной демо-страницы

- [ ] Task 9: Добавить видимый 3D fallback в `index.html`, `src/app/styles.css`, `src/modules/rendering/scene3d.ts` и `src/app/main.ts`: если WebGL/Three.js renderer не создается, пользователь видит короткое сообщение и может продолжать использовать 2D-визуализацию. Уточнить контракт `HullScene3d` через явный `isAvailable`/`failureReason` или callback для fallback-сообщения, потому что сейчас renderer failure превращается в молчаливый no-op. Logging: один `warn` с причиной init failure, без noisy повторов.

- [ ] Task 10: Обновить `scripts/check-encoding.mjs` expectedStrings для ключевых русских строк `Public Demo v1`: hero/описание, CTA или demo-first текст и 3D fallback-сообщение. Не включать длинные маркетинговые фразы, только стабильные короткие строки, которые должны защищать UTF-8 contract. Logging: не требуется.

- [ ] Task 11: Проверить import/export actions для публичного demo flow: `src/modules/persistence/*`, `src/app/main.ts`, docs. Убедиться, что SVG/CSV/JSON/theoretical SVG остаются доступными, а JSON round-trip не ломает `B/H` и 3D settings. Если меняется UI текст, обновить encoding tests/DOM contract. Logging: существующие export/import logs сохранить.

- [ ] Task 12: Добавить/обновить tests для demo-stability changes после Tasks 2, 4, 6, 7, 9, 10 и 11: `src/app/dom-contract.test.ts`, `src/app/appState.test.ts`, `src/modules/rendering/*`, `src/modules/ui/*` по измененным зонам. Покрыть fallback DOM, responsive-sensitive class contract там, где это возможно без real browser, и resize lifecycle helpers, если они выделены в тестируемые функции. Logging: не требуется.

### Фаза 4: Документация, smoke и deploy readiness

- [ ] Task 13: Проверить production branding/deploy notes: `README.md`, `docs/docker.md`, `compose.yml`, `Dockerfile`, `docker/nginx/default.conf`. Не переименовывать image/service без необходимости; если `airship` naming остается, документировать как техническое имя или запланировать follow-up. Logging: не требуется.

- [ ] Task 14: Выполнить финальные автоматические проверки через Docker: `docker compose run --rm app npm run check:encoding`, `docker compose run --rm app npm run test`, `docker compose run --rm app npm run build`. Зафиксировать Vite chunk-size warning как non-blocking, если он остается без новых ошибок. Logging: не требуется.

- [ ] Task 15: Выполнить production/mobile smoke по checklist: production container `/healthz` и `/`, desktop browser smoke, smartphone/emulated viewport smoke. Если браузер/устройство недоступны в окружении, записать точный blocker в итоговую заметку пользователю и не считать manual smoke полностью пройденным. Logging: не требуется.

- [ ] Task 16: Создать или обновить документацию public demo smoke после Task 15: `docs/testing.md`, `docs/docker.md` или новый `docs/public-demo.md`. Включить desktop и smartphone checklist: 360/390/412px viewports, 2D/3D, controls, geometry mode, downloads, JSON round-trip, equipment warnings, theoretical drawing, production container `/healthz`, а также фактический результат smoke или точный blocker из текущего окружения. Logging: не требуется.

## Критерии приемки

- Главная страница сразу объясняет, что это интерактивный демо-инструмент для визуализации корпуса подводного аппарата.
- 2D и 3D визуализация доступны без прокрутки через длинные описания на desktop.
- На смартфонах шириной `360px..430px` controls, 2D canvas, 3D scene, equipment editor, theoretical drawing и таблицы не ломают layout.
- 3D не оставляет пустой/непонятный блок при WebGL failure; пользователь видит fallback и может работать с 2D.
- `L/B/H/lambda/ЦВК`, geometry mode и formula display работают как до упаковки сайта.
- Экспорт SVG/CSV/JSON и импорт JSON продолжают работать; JSON round-trip сохраняет `B/H` и 3D settings.
- Теоретический чертеж на mobile либо читаем через scroll, либо явно остается дополнительным scrollable engineering view.
- Описательная часть честно говорит, что это prototype/demo; большие roadmap-функции не обещаются как готовые.
- Ключевые русские строки Public Demo v1 и 3D fallback защищены `check:encoding`.
- `check:encoding`, `test`, `build` проходят.
- Production smoke `/healthz` и загрузка SPA проходят в контейнере.

## Commit Plan

1. После Tasks 1-3: `docs(site): define public demo scope`
2. После Tasks 4-8: `feat(ui): improve responsive demo visualization`
3. После Tasks 9-12: `fix(rendering): add public demo fallbacks`
4. После Tasks 13-16: `docs(qa): add public demo smoke checklist`

## Коммит

Не выполнять commit/push без отдельного разрешения пользователя.
