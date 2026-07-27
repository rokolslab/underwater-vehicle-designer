# AGENTS.md

> Карта проекта для AI-агентов. Обновляйте этот файл при существенном изменении структуры репозитория.

## Обзор проекта

Underwater Vehicle Designer — браузерный инженерный инструмент для построения 2D/3D-обводов корпуса подводного аппарата и базовой компоновки оборудования. Текущая версия работает на Vite + TypeScript, поддерживает режимы геометрии `current-formula` и legacy DSNP_PA traceability mode, сохраняет canvas-визуализацию, Three.js-просмотр, таблицу координат станций, список оборудования, расчетные проверки компоновки оборудования и экспорт SVG/CSV/JSON и отдельный теоретический чертеж корпуса. Подробное описание проекта хранится в `.ai-factory/DESCRIPTION.md`.

## Текущий стек

- **Язык:** TypeScript
- **Интерфейс:** HTML, CSS через Vite entrypoint
- **Графика:** Canvas 2D, Three.js
- **Сборка:** Vite
- **Тесты:** Vitest
- **Экспорт:** SVG, CSV, JSON проекта
- **Docker:** dev/prod контейнеры для разработки и VPS smoke checks

## Термины проекта

- **ЦВК** — цилиндрическая вставка корпуса: прямой участок постоянного максимального сечения, задаваемый длиной в метрах.
- **ЦВ** — центр величины: расчетная точка баланса по вытесненному объему; не используйте `ЦВ` как сокращение для цилиндрической вставки.
- **Legacy DSNP_PA geometry** — режим регрессии/traceability с эллиптическими сечениями первого slice; `Priam`/`Kr` и инженерная валидация исторических коэффициентов являются follow-up.

## Координаты

- Body/SNAME-NED: начало в центре, `+X` к носу, `+Y` на правый борт, `+Z` вниз.
- Profile: `s=0` на носу, `s=L` на корме; `body.x=L/2-s`.
- Three.js и Canvas/SVG используют только adapters. JSON v2 marker: `SNAME_NED_BODY_CENTER_V1`.
- ЦВ текущего balance — equipment-only, не ЦВ внешнего герметичного корпуса.

## Следующие целевые расширения

- **3D-графика:** Three.js
- **Геометрия:** дальнейшее развитие legacy DSNP_PA beyond elliptical first slice и будущие параметры сечений
- **Компоновка:** более точные CAD-подобные проверки оборудования внутри корпуса
- **Баланс:** ЦТ, ЦВ, крен и дифферент

## Структура проекта

```text
.
├── .agents/                  # Локальные AI Factory skills
├── .codex/                   # Локальная конфигурация Codex, если появится
├── .ai-factory/              # Контекст AI Factory: планы, правила, архитектура
├── docker/
│   └── nginx/                # Конфигурация nginx для production container
├── docs/                     # Документация по разработке и эксплуатации
├── src/
│   ├── shared/body-coordinates.ts # Body/Profile types and pure conversions
│   ├── app/
│   │   ├── main.ts           # Vite entrypoint и UI orchestration
│   │   ├── appState.ts       # Нормализация ввода корпуса, lastEdited, reset
│   │   ├── projectState.ts    # App-layer aggregate: profile, equipment, scene3dSettings, balanceSettings
│   │   └── styles.css        # Основные стили приложения
│   ├── modules/
│   │   ├── geometry/         # Чистая расчетная геометрия, ProfileSnapshot и данные теоретического чертежа
│   │   ├── equipment/        # Модель оборудования и операции размещения
│   │   ├── balance/          # Расчеты ЦВ и будущие расчеты баланса
│   │   ├── rendering/        # Canvas 2D, theoretical drawing, Three.js, mesh/equipment/view settings
│   │   ├── persistence/      # JSON project import/export, CSV/SVG/theoretical drawing SVG/download
│   │   └── ui/               # Controls, equipment editor, table, metrics
│   └── shared/               # Общие helpers: math, format, logger
├── tests/fixtures/           # Эталонные данные, включая fixture по formula.xlsx
├── index.html                # Vite HTML shell
├── package.json              # npm scripts и dev dependencies
├── package-lock.json         # Зафиксированные версии toolchain
├── tsconfig.json             # TypeScript strict config
├── vite.config.ts            # Vite/Vitest config
├── Dockerfile                # Multi-stage dev/build/production image
├── compose.yml               # Базовая Docker Compose конфигурация
├── compose.override.yml      # Development override для Vite dev server
├── compose.production.yml    # Hardened production overlay для VPS
├── TECHNICAL_SPEC.md         # Техническое задание на следующие версии
├── formula.xls               # Табличный источник/регрессия расчетов
└── formula.xlsx              # Табличный источник/регрессия расчетов
```

## Ключевые точки входа

| Файл | Назначение |
| --- | --- |
| `index.html` | Vite HTML shell, загружает `/src/app/main.ts` |
| `src/app/main.ts` | Инициализация DOM, сборка ProjectState, canvas/table/metrics/3D/export orchestration |
| `src/app/appState.ts` | Нормализация пользовательского ввода корпуса, связь `H = L / lambda`, `lastEdited` |
| `src/app/projectState.ts` | App-layer aggregate для `profile`, `equipment`, `scene3dSettings` |
| `src/modules/geometry/model.ts` | `GeometryMode`, `ProfileState`, section extents и `ProfileSnapshot` contract |
| `src/modules/geometry/profile.ts` | Выбор geometry mode, станции, smooth points, extents, `ProfileSnapshot` |
| `src/modules/geometry/current-formula.ts` | Текущая формула радиуса и ЦВК |
| `src/modules/geometry/legacy-dsnp-pa.ts` | DSNP_PA regression/traceability evaluator: `MaxWl`/`MaxBt`, elliptical first slice |
| `src/modules/geometry/theoretical-drawing.ts` | Чистые данные теоретического чертежа: профиль, полуширота, сечения, ватерлинии и батоксы |
| `src/modules/balance/center-of-buoyancy.ts` | Устаревший расчет объема и ЦВ геометрического корпуса; не является реализацией ЦВК |
| `src/modules/balance/equipment-balance.ts` | Pure equipment balance calculation: CG, CB, mass, buoyancy, weight, moment arms and warning codes |
| `src/modules/equipment/model.ts` | Типы оборудования, объем, центр и displaced-volume helpers |
| `src/modules/equipment/placement.ts` | Создание, update/delete/rename и нормализация equipment list |
| `src/modules/equipment/constraints.ts` | Проверки выхода оборудования за корпус, пересечений и status report для UI/2D/3D |
| `src/shared/body-coordinates.ts` | Body/SNAME-NED types, Profile s↔Body X, vector operations |
| `src/modules/rendering/coordinate-adapter.ts` | Body↔Three and XZ/XY/YZ projection adapters |
| `src/modules/balance/stability.ts` | BG, alignment deltas and Body moments |
| `src/modules/persistence/project-json-migrations.ts` | One-way JSON v1→v2 coordinate migration |
| `src/modules/rendering/canvas2d.ts` | Отрисовка 2D-профиля на canvas |
| `src/modules/rendering/theoretical-drawing.ts` | Canvas-отрисовка теоретического чертежа корпуса |
| `src/modules/rendering/scene3d.ts` | Three.js-сцена корпуса, X-Ray/Cutaway, clipping и equipment meshes |
| `src/modules/rendering/viewSettings.ts` | Нормализация 3D-режима, прозрачности и сечений |
| `src/modules/rendering/equipment3d.ts` | 3D signature/transform helpers и mesh factory для оборудования |
| `src/modules/persistence/project-json.ts` | JSON import/export проекта: profile, equipment, 3D и balance settings |
| `src/modules/persistence/svg.ts` | SVG export текущего профиля |
| `src/modules/persistence/theoretical-drawing-svg.ts` | SVG export листа теоретического чертежа |
| `src/modules/persistence/csv.ts` | CSV export координат станций |
| `scripts/check-encoding.mjs` | Проверка UTF-8 и ключевых русских UI-строк |
| `Dockerfile` | Сборка dev/build/production образов |
| `compose.override.yml` | Docker-окружение разработки на `127.0.0.1:5173` |
| `compose.production.yml` | Production smoke/deploy overlay для VPS |
| `formula.xlsx` | Эталонные данные для регрессии формулы |

## Документация

| Документ | Путь | Описание |
| --- | --- | --- |
| README | `README.md` | Входная страница проекта |
| Getting Started | `docs/getting-started.md` | Установка, запуск, проверки |
| UI/UX Guide | `docs/ui-ux.md` | Интерфейс и UX-сценарии |
| Calculations | `docs/calculations.md` | Геометрия, ограничения, баланс |
| Architecture | `docs/architecture.md` | Модули и потоки данных |
| Data and Export | `docs/data-and-export.md` | JSON, CSV, SVG |
| Testing | `docs/testing.md` | Тесты и smoke checks |
| Docker Workflow | `docs/docker.md` | Docker и production smoke |
| Анализ ДСНП_ПА | `docs/legacy/` | Карта исторической системы, модели данных, расчётов и roadmap интеграции |
| Техническое задание | `TECHNICAL_SPEC.md` | Целевой функционал следующих версий |
| Описание проекта | `.ai-factory/DESCRIPTION.md` | Контекст AI Factory |
| Архитектура AI Factory | `.ai-factory/ARCHITECTURE.md` | Архитектурные правила |
| Базовые правила | `.ai-factory/rules/base.md` | Соглашения по коду |

## AI Context Files

| Файл | Назначение |
| --- | --- |
| `AGENTS.md` | Быстрая карта проекта для AI-агентов |
| `.ai-factory/DESCRIPTION.md` | Проектное описание и стек |
| `.ai-factory/ARCHITECTURE.md` | Архитектурные правила и границы модулей |
| `.ai-factory/rules/base.md` | Базовые соглашения по коду |
| `.ai-factory/config.yaml` | Настройки AI Factory |

## Docker workflow

Docker является предпочтительным окружением для дальнейшей разработки агентом и VPS smoke checks.

- Разработка: `docker compose up app`
- Тесты: `docker compose run --rm app npm run test`
- Сборка: `docker compose run --rm app npm run build`
- Проверка кодировки: `docker compose run --rm app npm run check:encoding`
- Production smoke: `docker compose -f compose.yml -f compose.production.yml up -d`

## Правила для агентов

- Не объединяйте независимые shell-команды через `&&`, `;` или pipeline, если шаги можно выполнить и проверить отдельно.
  - Неверно: `git checkout main && git pull`
  - Верно: сначала `git checkout main`, затем `git pull origin main`
- Расчетная геометрия должна оставаться в чистых TypeScript-модулях без DOM/canvas/browser side effects.
- UI/appState отвечает за пользовательский ввод, clamp/round, `lastEdited` и форматирование; geometry получает уже нормализованное состояние.
- Canvas, SVG, CSV, table и metrics должны использовать общий `ProfileSnapshot`, а не пересчитывать геометрию самостоятельно.
- 3D hull mesh должен использовать `halfBreadthY`/`halfHeightZ` из snapshot; оба geometry modes строятся как exact elliptical ring mesh, не тело вращения по compatibility `radius`.
- Производные инженерные расчеты вроде ЦВ держите в `balance`, а не в `geometry` или UI.
- При изменении формулы или координатной системы обновляйте Vitest-регрессии и fixture по `formula.xlsx`.
