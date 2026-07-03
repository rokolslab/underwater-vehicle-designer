[Back to README](../README.md) · [UI/UX Guide →](ui-ux.md)

# Getting Started

Эта страница описывает запуск приложения, проверку окружения и первый рабочий сценарий.

## Prerequisites

| Tool | Purpose |
| --- | --- |
| Node.js | Запуск Vite, TypeScript и Vitest |
| npm | Установка зависимостей и запуск scripts |
| Docker | Воспроизводимая разработка и production smoke |
| Git | Работа с изменениями и ветками |

Проект не требует backend, базы данных, очереди или внешнего API. Все расчеты выполняются в браузере.

## Installation

```bash
npm install
```

`package-lock.json` фиксирует версии toolchain. Основные зависимости:

| Package | Role |
| --- | --- |
| `vite` | Dev server и production build |
| `typescript` | Strict TypeScript checking |
| `vitest` | Unit/regression tests |
| `three` | 3D-сцена корпуса и оборудования |

## Local Development

```bash
npm run dev
```

Откройте:

```text
http://127.0.0.1:5173
```

Vite entrypoint находится в `index.html`, который загружает `src/app/main.ts`.

## Docker Development

Docker — предпочтительный способ для воспроизводимых проверок:

```bash
docker compose up app
```

Приложение будет доступно на `127.0.0.1:5173`. Подробности: [Docker Workflow](docker.md).

## Verification

Перед commit или push запускайте:

```bash
npm run check:encoding
npm run test
npm run build
```

Что проверяется:

| Command | Checks |
| --- | --- |
| `npm run check:encoding` | UTF-8 и ключевые русские UI-строки |
| `npm run test` | Расчетные модули, импорт/экспорт, UI contract |
| `npm run build` | `tsc --noEmit` и production Vite build |

## First Project Scenario

1. Откройте страницу приложения.
2. В панели `Размерения` задайте длину, удлинение, диаметр и ЦВК.
3. В панели `Боковой вид` включите или выключите сетку и точки.
4. Проверьте 3D-панель и при необходимости включите сечение.
5. В панели `Оборудование` добавьте сферу, цилиндр или блок.
6. Исправьте предупреждения компоновки, если объект вышел за корпус или пересекся с другим.
7. Проверьте блок `Баланс`.
8. Сохраните проект через `Сохранить проект`.

## Repository Map

| Path | Purpose |
| --- | --- |
| `index.html` | HTML shell и DOM contract |
| `src/app/` | UI orchestration, state, styles |
| `src/modules/geometry/` | Чистая геометрия корпуса и теоретический чертеж |
| `src/modules/equipment/` | Оборудование, размеры, ограничения |
| `src/modules/balance/` | ЦТ/ЦВ и плавучесть по оборудованию |
| `src/modules/rendering/` | Canvas 2D и Three.js rendering |
| `src/modules/persistence/` | JSON, CSV, SVG export/import |
| `src/modules/ui/` | Рендеринг редакторов, таблиц и метрик |
| `tests/fixtures/` | Эталонные данные, включая `formula-profile.json` |

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Русские строки выглядят поврежденными в PowerShell | Запустите `npm run check:encoding`; terminal output может показывать mojibake, файл при этом валиден |
| 3D-сцена пустая после изменения layout | Перезагрузите страницу; при открытии панели приложение вызывает resize сцены |
| CSV/SVG не скачиваются | Проверьте, что страница запущена через Vite, а не открыта как raw file |
| JSON не загружается | Проверьте `schemaVersion`; текущая версия схемы — `1` |

## See Also

- [UI/UX Guide](ui-ux.md) — панели и пользовательские сценарии.
- [Calculations](calculations.md) — формулы и ограничения.
- [Testing](testing.md) — тестовый набор и регрессии.
