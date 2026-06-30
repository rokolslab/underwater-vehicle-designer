# План реализации: синхронизировать AI Factory git settings

Branch: master
Created: 2026-06-30

## Настройки
- Testing: yes
- Logging: standard
- Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Служебная синхронизация AI Factory workflow с уже созданным git-репозиторием; продуктовые вехи roadmap не меняются.

## Контекст

В проекте уже инициализирован git-репозиторий, текущая ветка называется `master`, remote не настроен. В `.ai-factory/config.yaml` сейчас сохранено `git.enabled: false` и `git.base_branch: main`, из-за чего AI Factory продолжает работать как в no-git режиме. Нужно привести настройки в соответствие с фактическим состоянием репозитория и не включать автоматическое создание веток до появления remote.

## Задачи

### Фаза 1: Обновление конфигурации
- [x] Task 1: Обновить `.ai-factory/config.yaml`: выставить `git.enabled: true`, заменить `git.base_branch: main` на `git.base_branch: master`, оставить `git.create_branches: false`.
  - Ожидаемое поведение: AI Factory skills распознают проект как git-aware, но не пытаются создавать feature branches или делать `git pull origin master`.
  - Logging requirements: для этой конфигурационной правки отдельный runtime logging не нужен; в итоговом выводе явно зафиксировать старые и новые значения ключей.
  - Зависимости: нет.

### Фаза 2: Проверка согласованности
- [x] Task 2: Проверить фактическое состояние git после изменения конфигурации.
  - Команды: `git branch --show-current`, `git remote -v`, `git status --short`.
  - Ожидаемое поведение: ветка `master`, remote отсутствует или пустой, рабочее дерево содержит только ожидаемое изменение `.ai-factory/config.yaml` и этот fast-план.
  - Logging requirements: сохранить в итоговом выводе краткий summary результатов команд и отдельно отметить, почему `create_branches` остается `false`.
  - Зависимости: Task 1.

### Фаза 3: Quality gate
- [x] Task 3: Запустить encoding gate и базовую проверку плана.
  - Команды: `node scripts/check-encoding.mjs`, затем `$aif-verify` после реализации.
  - Ожидаемое поведение: UTF-8 проверка проходит без warnings/errors; verify не находит блокирующих расхождений между планом и изменением.
  - Logging requirements: в итоговом выводе привести pass/fail статус проверок и перечислить любые warnings.
  - Зависимости: Task 2.

## Commit Plan

Один commit после выполнения всех задач:
- `chore: sync ai factory git settings`
