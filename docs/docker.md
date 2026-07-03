[← Testing](testing.md) · [Back to README](../README.md)

# Docker Workflow

Docker является предпочтительным окружением для воспроизводимой разработки и проверок. Он снижает влияние Windows PowerShell encoding pitfalls и использует одинаковые команды для локального smoke и VPS-проверок.

## Разработка

Запуск Vite внутри Docker:

```bash
docker compose up app
```

Приложение будет доступно по адресу:

```text
http://127.0.0.1:5173
```

Development service монтирует репозиторий в `/app`, а зависимости контейнера хранит в именованном volume `node_modules`.

## Проверки

Запуск проектных проверок внутри Docker:

```bash
docker compose run --rm app npm run test
docker compose run --rm app npm run build
docker compose run --rm app npm run check:encoding
```

Те же npm scripts можно запускать напрямую на host-машине, но Docker остается воспроизводимым окружением по умолчанию для агентской работы.

## Production Smoke

Сборка и запуск production container локально:

```bash
docker compose -f compose.yml -f compose.production.yml build app
docker compose -f compose.yml -f compose.production.yml up -d
```

По умолчанию production публикует приложение на host port `80` и обслуживает собранный `dist/` через nginx на container port `8080`.

Порты и параметры image можно переопределить через environment variables:

```bash
COMPOSE_PROJECT_NAME=airship APP_PORT=8080 APP_IMAGE=airship:local docker compose -f compose.yml -f compose.production.yml up -d
```

## Compose Files

| File | Purpose |
| --- | --- |
| `compose.yml` | Базовое описание service |
| `compose.override.yml` | Development override для Vite на `127.0.0.1:5173` |
| `compose.production.yml` | Hardened production overlay |
| `Dockerfile` | Multi-stage dev/build/production image |
| `docker/nginx/` | nginx config для production image |

## VPS Notes

Текущий production compose намеренно остается single-service:

- нет database;
- нет cache;
- нет queue;
- нет внешнего reverse proxy;
- нет встроенной настройки TLS/domain.

Domain TLS или edge reverse proxy стоит добавлять отдельным AI Factory планом, когда будут известны домен VPS и схема публикации.

## See Also

- [Getting Started](getting-started.md) — локальный и Docker-запуск.
- [Testing](testing.md) — команды проверки.
- [Architecture](architecture.md) — runtime-структура, которую обслуживает Docker.
