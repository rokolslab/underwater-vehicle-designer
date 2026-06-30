# РџРµСЂРµС…РѕРґ СЂР°Р·СЂР°Р±РѕС‚РєРё Рё VPS-РґРµРїР»РѕСЏ РЅР° Docker

**Branch:** `feature/docker-development-environment`
**Created:** 2026-06-30

## Settings

- Testing: yes
- Logging: standard
- Docs: yes
- Roadmap linkage: skipped

## Roadmap Linkage

Milestone: "none"
Rationale: "Skipped by user; Docker is enabling infrastructure for future VPS deployment."

## Context

РџСЂРѕРµРєС‚ СЏРІР»СЏРµС‚СЃСЏ frontend-only Vite + TypeScript SPA Р±РµР· backend-СЃРµСЂРІРёСЃРѕРІ, Р±Р°Р·С‹ РґР°РЅРЅС‹С…, cache РёР»Рё queue. Docker РґРѕР»Р¶РµРЅ СЃС‚Р°С‚СЊ РѕСЃРЅРѕРІРЅС‹Рј РІРѕСЃРїСЂРѕРёР·РІРѕРґРёРјС‹Рј РѕРєСЂСѓР¶РµРЅРёРµРј РґР»СЏ СЂР°Р·СЂР°Р±РѕС‚РєРё Р°РіРµРЅС‚РѕРј Рё Р±Р°Р·РѕР№ РґР»СЏ РїСЂРѕСЃС‚РѕРіРѕ VPS-РґРµРїР»РѕСЏ СЃС‚Р°С‚РёС‡РµСЃРєРѕРіРѕ `dist/`.

## Tasks

### Phase 1: AI Factory Dockerize Profile

- [x] Task 1: Confirm Docker profile and image tags.
  - Files: `package.json`, Docker registry metadata via Docker tooling.
  - Deliverable: choose Node 24 Alpine for build/dev and an unprivileged static web server image for production.
  - Logging: no app logging changes; record verification command outcomes in implementation summary.
  - Dependencies: none.

### Phase 2: Docker Artifacts

- [x] Task 2: Add Dockerfile and static web server config.
  - Files: `Dockerfile`, `docker/nginx/default.conf`.
  - Deliverable: stages `deps`, `development`, `builder`, `production`; dev runs Vite on `0.0.0.0:5173`, production serves `dist/`.
  - Logging: no runtime app logging; Dockerfile stages must be named clearly for build logs.
  - Dependencies: Task 1.

- [x] Task 3: Add Compose files for development and VPS.
  - Files: `compose.yml`, `compose.override.yml`, `compose.production.yml`.
  - Deliverable: dev bind mount with isolated `node_modules`; production hardened single-service deployment with healthcheck, log rotation, restart policy, read-only filesystem where practical.
  - Logging: configure Docker log rotation in production overlay.
  - Dependencies: Task 2.

- [x] Task 4: Add Docker build context hygiene.
  - Files: `.dockerignore`.
  - Deliverable: exclude `.git`, dependencies, build output, local env files, AI local work artifacts, and Docker-only generated noise from build context.
  - Logging: no app logging changes.
  - Dependencies: Task 2.

### Phase 3: Documentation and Context

- [x] Task 5: Document Docker workflow.
  - Files: `docs/docker.md`, `AGENTS.md`, `.ai-factory/DESCRIPTION.md` if stack/context changed.
  - Deliverable: record dev/test/build/encoding commands and VPS compose command.
  - Logging: no app logging changes.
  - Dependencies: Tasks 2-4.

### Phase 4: Verification

- [x] Task 6: Verify local npm and Docker workflows.
  - Files: no source edits expected.
  - Deliverable: run `npm run build`, `npm run test`, `npm run check:encoding`, `docker compose build`, Dockerized test/build/encoding commands, and production config validation where available.
  - Logging: report command outcomes and any blocked Docker checks.
  - Dependencies: Tasks 2-5.

## Commit Plan

Single commit after all tasks:

```text
build(docker): add development and VPS containers
```






