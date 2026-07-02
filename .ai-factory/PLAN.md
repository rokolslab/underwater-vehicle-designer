# План исправления: уточнить компоновку теоретического чертежа

Branch: master
Created: 2026-07-03

## Контекст

По пользовательскому референсу вид `Корпус` должен располагаться в верхнем ряду на уровне вида `Бок`, а не занимать всю высоту рядом с двумя продольными проекциями. На видах `Бок` и `Полуширота` должны быть видны семейства линий сечений: для осесимметричного корпуса это батоксы на боковой проекции и ватерлинии на полушироте.

## Задачи

- [x] Task 1: Расширить `src/modules/geometry/theoretical-drawing.ts` производными кривыми `profileButtockCurves` и `halfBreadthWaterlineCurves`, рассчитанными из `ProfileSnapshot` без DOM/canvas side effects. Logging: не добавлять logs в geometry.
- [x] Task 2: Обновить canvas layout: `Корпус` поставить на уровне `Бок`, ниже оставить `Полушироту`; нарисовать несколько внутренних кривых на `Бок` и `Полуширота`. Logging: расширить существующий `logger.debug` количеством кривых.
- [x] Task 3: Синхронизировать SVG export с canvas: та же компоновка и те же внутренние линии сечений. Logging: не добавлять logs в SVG builder.
- [x] Task 4: Добавить Vitest-регрессии на наличие и геометрию производных кривых.
- [x] Task 5: Обновить AI Factory контекст и создать patch-заметку по исправлению.
- [x] Task 6: Прогнать `npm run test`, `npm run build`, `npm run check:encoding` и browser smoke.

## Commit Plan

Один commit после проверки:
- `fix(rendering): align theoretical drawing projections`
