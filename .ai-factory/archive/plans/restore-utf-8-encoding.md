---
archived: 2026-08-03
---

# Implementation Plan: восстановить UTF-8 кодировку интерфейса и документов

Branch: none (`git.enabled: false` in `.ai-factory/config.yaml`; текущая Git-ветка: `master`)
Created: 2026-06-29

## Settings
- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage
Milestone: "Восстановить и закрепить корректную русскую кодировку"
Rationale: Этот план напрямую закрывает первую незавершенную веху roadmap: привести пользовательские тексты и проектные документы к нормальному UTF-8 и закрепить проверку.

## Context

Текущий проект уже содержит русские строки в `index.html`, `script.js`, `TECHNICAL_SPEC.md`, `AGENTS.md` и `.ai-factory/*.md`. При чтении с явным `-Encoding UTF8` основные файлы отображаются корректно, поэтому реализация должна сначала отличить реальные поврежденные строки от проблем вывода терминала. Цель не в массовой переписи всех файлов, а в проверяемой нормализации UTF-8 и защите от повторного mojibake.

## Commit Plan
- **Commit 1** (after tasks 1-3): `chore: enforce utf-8 text encoding`
- **Commit 2** (after tasks 4-6): `test: add utf-8 encoding verification`

## Tasks

### Phase 1: Диагностика и правила кодировки
- [x] Task 1: Провести инвентаризацию текстовых файлов и зафиксировать реальные проблемы кодировки.
  - Deliverable: список проверенных файлов и точный перечень строк, которые действительно содержат mojibake или некорректные символы.
  - Files: `index.html`, `script.js`, `styles.css`, `TECHNICAL_SPEC.md`, `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/ROADMAP.md`, `.ai-factory/rules/base.md`.
  - Expected behavior: выполнять строгую byte-level UTF-8 проверку, отдельно искать контекстные mojibake-паттерны вроде `Рџ`, `Рґ`, `СЃ`, `вЂ`, `â`, `�`, и отдельно отмечать ложные срабатывания из-за кодировки вывода PowerShell/терминала.
  - Logging requirements: в диагностическом выводе использовать verbose-уровень: `DEBUG` для каждого проверенного файла и способа чтения, `INFO` для количества проверенных файлов, `WARN` для подозрительных строк или false-positive терминального вывода, `ERROR` для невалидного UTF-8 или невозможности прочитать файл.
  - Dependency notes: базовый шаг для всех последующих задач; без него нельзя безопасно переписывать тексты.

- [x] Task 2: Добавить правила хранения текстовых файлов в UTF-8.
  - Deliverable: проект явно задает UTF-8 для исходников, markdown-документов, HTML/CSS/JS и конфигов.
  - Files: `.editorconfig`, `.gitattributes`.
  - Expected behavior: `.editorconfig` задает `charset = utf-8`, финальный перевод строки и LF для текстовых файлов; `.gitattributes` помечает HTML/CSS/JS/MD/YAML/JSON/TOML как text и `*.xls`/`*.xlsx` как binary.
  - Logging requirements: в комментариях файлов не писать runtime-логи; в плане реализации вывести `INFO [encoding] added editor and git attributes` и `DEBUG [encoding] binary patterns preserved` при проверке.
  - Dependency notes: зависит от Task 1, чтобы не пометить бинарные файлы как текстовые.

- [x] Task 3: Нормализовать пользовательские строки интерфейса без изменения поведения приложения.
  - Deliverable: все видимые русские строки в текущем статическом интерфейсе читаются корректно в UTF-8.
  - Files: `index.html`, `script.js`.
  - Expected behavior: заголовки, подписи форм, `aria-label`, счетчик точек, кнопки и подписи таблицы остаются русскими и корректно отображаются; формула, числовой формат `ru-RU`, SVG/CSV export и расчетная логика не меняются.
  - Logging requirements: runtime-логирование в приложение не добавлять; при реализации вывести `INFO [encoding] normalized UI strings`, а для каждой измененной строки дать `DEBUG [encoding] <file>:<line>`.
  - Dependency notes: зависит от Task 1; если интерфейсные строки уже корректны, задача должна завершиться без лишних изменений.

### Phase 2: Документы, проверка и защита от регрессии
- [x] Task 4: Нормализовать русские проектные документы и убрать устаревшие предупреждения.
  - Deliverable: документы читаются как UTF-8, а AI context больше не утверждает, что в файлах есть неверно декодированный UTF-8, если диагностика это не подтверждает.
  - Files: `TECHNICAL_SPEC.md`, `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/ROADMAP.md`, `.ai-factory/rules/base.md`.
  - Expected behavior: содержимое документов остается по смыслу тем же; `.ai-factory/DESCRIPTION.md` и любые другие затронутые AI context files отражают фактический диагноз: source files являются UTF-8, но Windows/PowerShell display может давать false mojibake без явного UTF-8 чтения или проверки скриптом.
  - Logging requirements: при реализации вывести `INFO [encoding] normalized docs`, `DEBUG` для каждого измененного документа и `WARN` для оставленных спорных мест, требующих ручного решения.
  - Dependency notes: зависит от Task 1; не должен менять roadmap ownership сверх текстовой корректировки, если веха еще не закрыта.

- [x] Task 5: Добавить автоматическую проверку UTF-8 и mojibake-паттернов.
  - Deliverable: есть локальный скрипт, который проверяет текстовые файлы на валидный UTF-8 и очевидные mojibake-паттерны.
  - Files: `scripts/check-encoding.mjs`; `package.json` не создавать только ради этой проверки, интеграцию добавлять только если пакетный файл уже появится позже.
  - Expected behavior: standalone-запуск `node scripts/check-encoding.mjs` пропускает hidden/tool/binary directories (`.git`, `.agents`, `.codex`, `.codex-work`) и бинарные файлы (`formula.xls`, `formula.xlsx`), сканирует project-owned HTML/CSS/JS/MD/YAML/JSON/TOML включая `.ai-factory` docs, проверяет representative UI strings (`Обвод дирижабля`, `Расчётные параметры`, `Скачать SVG`, `Координаты станций`, `точек`), возвращает exit code `0` при чистом состоянии и non-zero при проблемах.
  - Logging requirements: скрипт должен логировать `INFO` с количеством проверенных файлов, `DEBUG` с путями при verbose-режиме, `WARN` с подозрительными совпадениями и `ERROR` с причиной провала; управление подробностью через `--verbose` или переменную `DEBUG`.
  - Dependency notes: зависит от Tasks 1-4, чтобы проверка отражала уже нормализованное состояние.

- [x] Task 6: Выполнить регрессионную проверку интерфейса и экспортов после нормализации.
  - Deliverable: подтверждено, что нормализация кодировки не сломала текущий 2D-прототип.
  - Files: `index.html`, `script.js`, `styles.css`, `scripts/check-encoding.mjs`.
  - Expected behavior: страница открывается, canvas строит профиль, таблица станций заполняется, кнопки SVG/CSV сохраняют файлы с корректными именами и содержимым, русские строки видны без искажений.
  - Logging requirements: запускать `node scripts/check-encoding.mjs --verbose`; сохранять в итоговом сообщении ключевые строки `INFO/WARN/ERROR`; для ручной UI-проверки фиксировать проверенные сценарии кратким checklist.
  - Dependency notes: финальный шаг; зависит от Tasks 3, 4 и 5.

## Verification
- Run: `node scripts/check-encoding.mjs --verbose`
- Open: `index.html` directly in browser or through a simple static server if needed.
- Check: title, labels, buttons, table headers, point counter, SVG export, CSV export.
- Check: `TECHNICAL_SPEC.md`, `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/ROADMAP.md`, `.ai-factory/rules/base.md` read as UTF-8.
- Confirm: no unintended changes to geometry formula, station generation, canvas scaling, or export calculations.
