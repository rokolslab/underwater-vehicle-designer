# Docker workflow

Docker is the preferred development and verification environment for this project. It avoids Windows PowerShell encoding pitfalls and keeps the commands reproducible for VPS deployment.

## Development

Start Vite inside Docker:

```bash
docker compose up app
```

Open the application at:

```text
http://127.0.0.1:5173
```

The development service bind-mounts the repository into `/app` and keeps container dependencies in the named `node_modules` volume.

## Checks

Run project checks inside Docker:

```bash
docker compose run --rm app npm run test
docker compose run --rm app npm run build
docker compose run --rm app npm run check:encoding
```

The same npm scripts remain available directly on the host when needed, but Docker is the default for agent work.

## Production smoke

Build and run the production container locally:

```bash
docker compose -f compose.yml -f compose.production.yml build app
docker compose -f compose.yml -f compose.production.yml up -d
```

By default production publishes the app on host port `80` and serves the built `dist/` directory through nginx on container port `8080`.

Override ports and image settings with environment variables:

```bash
COMPOSE_PROJECT_NAME=airship APP_PORT=8080 APP_IMAGE=airship:local docker compose -f compose.yml -f compose.production.yml up -d
```

## VPS notes

The current production compose is intentionally single-service: no database, cache, queue, or external reverse proxy are included. Add domain TLS or an edge reverse proxy in a separate AI Factory plan when the VPS domain and publication scheme are known.
