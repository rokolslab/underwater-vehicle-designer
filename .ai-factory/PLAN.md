# План реализации: модуль теоретического чертежа

Branch: master
Created: 2026-07-02

## Настройки
- Testing: yes
- Logging: standard
- Docs: yes

## Roadmap Linkage
Milestone: "3D-графика и инженерная визуализация"
Rationale: Теоретический чертеж является инженерным 2D-представлением корпуса и должен использовать ту же расчетную геометрию, что canvas/SVG/3D.

## Контекст

Нужно добавить отдельный модуль "Теоретический чертеж" для подводного аппарата. Это не декоративный профиль, а инженерный вид с согласованными проекциями: продольный профиль, план/полуширота для осесимметричного корпуса, поперечные сечения по точкам, сетка, оси и размерные подписи. Данные должны строиться из `ProfileSnapshot`, без повторного расчета геометрии в UI.

## Задачи

### Фаза 1: Данные чертежа
- [x] Task 1: Создать чистый расчетный модуль `src/modules/geometry/theoretical-drawing.ts`, который строит данные чертежа из `ProfileSnapshot`: профильные точки, сечения по точкам, ватерлинии, батоксы/полушироты и метаданные масштаба. Logging: не добавлять logs в чистый geometry-модуль.
- [x] Task 2: Добавить Vitest-регрессии `src/modules/geometry/theoretical-drawing.test.ts` на согласованность с `ProfileSnapshot`, радиусы сечений и симметричные линии сетки. Logging: тесты не логируют.

### Фаза 2: Рендеринг и экспорт
- [x] Task 3: Добавить canvas-renderer `src/modules/rendering/theoretical-drawing.ts` для теоретического чертежа с тремя зонами: профиль, план/полуширота и поперечные сечения. Logging: использовать `logger.debug` для размеров canvas и количества сечений, `logger.warn` только при недоступном canvas context.
- [x] Task 4: Добавить SVG export `src/modules/persistence/theoretical-drawing-svg.ts`, использующий те же данные чертежа. Logging: не добавлять logs в persistence builder.

### Фаза 3: UI и контекст
- [x] Task 5: Интегрировать секцию "Теоретический чертеж" в `index.html`, `src/app/main.ts` и `src/app/styles.css`: отдельный canvas, кнопка экспорта SVG, адаптивная высота, обновление при изменении параметров. Logging: `logger.info` при экспорте чертежа и `logger.debug` при обновлении чертежа.
- [x] Task 6: Обновить `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md` только в части нового модуля/entrypoint; прогнать `npm run test`, `npm run build`, `npm run check:encoding` и browser smoke. Logging: сохранить результаты проверок в итоговом ответе.

## Commit Plan

Один commit после выполнения всех задач:
- `feat(rendering): add theoretical hull drawing module`
