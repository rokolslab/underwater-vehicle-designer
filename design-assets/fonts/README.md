# Font Research Set

Этот каталог содержит локальный набор WOFF2-файлов для последующего визуального сравнения шрифтов с кириллицей. Шрифты не подключены к сайту, CSS и конфигурация сборки не изменялись.

Файлы скачаны из Google Fonts CSS/API и Google Fonts GitHub repository. Для каждого семейства сохранен минимально полезный набор: `cyrillic` и `cyrillic-ext` WOFF2 subsets. Эти два subset-файла вместе покрывают базовую кириллицу и расширенную кириллицу, заявленную Google Fonts через `unicode-range`.

## Предварительные Рекомендации

- Onest — основной кандидат для интерфейса и обычного текста.
- Manrope — более геометричная и технологичная альтернатива.
- Golos Text — вариант для страниц с большим количеством русского текста.
- Commissioner — более характерный вариант для экспертного или студийного образа.
- IBM Plex Sans — инженерный и корпоративный вариант.
- IBM Plex Mono — кандидат для кода, команд и технических обозначений.

Окончательное решение о выборе шрифта не принято. Цель каталога — подготовить локальные файлы и справку для дальнейшего сравнения.

## Сравнительная Таблица

| Шрифт | Кириллица | Variable | Рекомендуемое применение | Предварительная оценка |
| ----- | --------- | -------- | ------------------------ | ---------------------- |
| Onest | Есть `cyrillic` и `cyrillic-ext` subsets; подходит для русского UI | Да, `100..900` | Основной UI, обычный текст, панели управления | Лучший стартовый кандидат: современный, спокойный, хорошо читаемый |
| Manrope | Есть `cyrillic` и `cyrillic-ext` subsets; подходит для русского UI | Да, `200..800` | UI, hero, технологичный product voice | Хорошая геометричная альтернатива, может выглядеть более холодно |
| Golos Text | Есть `cyrillic` и `cyrillic-ext` subsets; ориентирован на русский текст | Да, `400..900` | Документация, длинные русские тексты, справочные блоки | Сильный текстовый кандидат, менее характерный для hero |
| Commissioner | Есть `cyrillic` и `cyrillic-ext` subsets | Да, `100..900` | Акцентный UI, студийный/экспертный образ, заголовки | Самый выразительный вариант, требует аккуратной проверки в интерфейсе |
| IBM Plex Sans | Есть `cyrillic` и `cyrillic-ext` subsets | Да, `100..700` | Инженерный UI, корпоративные тексты, таблицы | Надежный и системный, может быть менее уникальным |
| IBM Plex Mono | Есть `cyrillic` и `cyrillic-ext` subsets для Regular/Medium | Нет в сохраненном наборе; static `400`, `500` | Код, команды, координаты, технические обозначения | Хороший monospace-компаньон, не основной текстовый шрифт |

## Onest

- **Визуальный характер:** современный гуманистический sans-serif, нейтральный, дружелюбный, без чрезмерной технологичности.
- **Кириллица:** Google Fonts предоставляет `cyrillic` и `cyrillic-ext` subsets. Подходит для русскоязычного интерфейса; качество нужно дополнительно оценить визуально в макетах.
- **Рекомендуемая область применения:** основной UI, формы, обычный текст, подписи, карточки.
- **Доступные веса:** `100..900`; Fontconfig распознает Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black.
- **Формат:** variable WOFF2 subsets.
- **Сохраненные файлы:**
  - `onest/onest-variable-cyrillic.woff2`
  - `onest/onest-variable-cyrillic-ext.woff2`
  - `onest/OFL.txt`
- **Источник:** Google Fonts CSS `https://fonts.googleapis.com/css2?family=Onest:wght@100..900&display=swap`; лицензия из `https://github.com/google/fonts/tree/main/ofl/onest`.
- **Лицензия:** SIL Open Font License 1.1.
- **Использование:** бесплатно для публичного сайта; OFL разрешает использование, распространение и модификацию при соблюдении условий лицензии. Название Reserved Font Name может ограничивать переименование модифицированных версий.

## Manrope

- **Визуальный характер:** геометричный, технологичный sans-serif с компактным современным ощущением.
- **Кириллица:** Google Fonts предоставляет `cyrillic` и `cyrillic-ext` subsets. Подходит для русского UI; визуально может казаться более жестким, чем Onest.
- **Рекомендуемая область применения:** интерфейс, hero, технические лендинговые элементы, продуктовые заголовки.
- **Доступные веса:** `200..800`; Fontconfig распознает ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold.
- **Формат:** variable WOFF2 subsets.
- **Сохраненные файлы:**
  - `manrope/manrope-variable-cyrillic.woff2`
  - `manrope/manrope-variable-cyrillic-ext.woff2`
  - `manrope/OFL.txt`
- **Источник:** Google Fonts CSS `https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap`; лицензия из `https://github.com/google/fonts/tree/main/ofl/manrope`.
- **Лицензия:** SIL Open Font License 1.1.
- **Использование:** бесплатно для публичного сайта при соблюдении OFL.

## Golos Text

- **Визуальный характер:** спокойный текстовый sans-serif, ориентированный на читаемость русскоязычного текста.
- **Кириллица:** Google Fonts предоставляет `cyrillic` и `cyrillic-ext` subsets. Для русского текста это один из наиболее естественных кандидатов.
- **Рекомендуемая область применения:** длинные тексты, справка, документационные страницы, подписи с большим объемом русского текста.
- **Доступные веса:** `400..900`; Fontconfig распознает Regular, Medium, SemiBold, Bold, ExtraBold, Black.
- **Формат:** variable WOFF2 subsets.
- **Сохраненные файлы:**
  - `golos-text/golos-text-variable-cyrillic.woff2`
  - `golos-text/golos-text-variable-cyrillic-ext.woff2`
  - `golos-text/OFL.txt`
- **Источник:** Google Fonts CSS `https://fonts.googleapis.com/css2?family=Golos+Text:wght@400..900&display=swap`; лицензия из `https://github.com/google/fonts/tree/main/ofl/golostext`.
- **Лицензия:** SIL Open Font License 1.1.
- **Использование:** бесплатно для публичного сайта при соблюдении OFL.

## Commissioner

- **Визуальный характер:** выразительный sans-serif с более заметным авторским характером; может дать экспертный или студийный образ.
- **Кириллица:** Google Fonts предоставляет `cyrillic` и `cyrillic-ext` subsets. Поддержка кириллицы есть; требуется визуальная проверка на плотных таблицах и формах.
- **Рекомендуемая область применения:** заголовки, акцентные блоки, экспертный UI, возможно основной интерфейс после проверки читабельности.
- **Доступные веса:** `100..900`; Fontconfig распознает Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black. В metadata subset-файлов family может отображаться как `Commissioner Thin`, что нужно учитывать при тестовой генерации `@font-face`.
- **Формат:** variable WOFF2 subsets.
- **Сохраненные файлы:**
  - `commissioner/commissioner-variable-cyrillic.woff2`
  - `commissioner/commissioner-variable-cyrillic-ext.woff2`
  - `commissioner/OFL.txt`
- **Источник:** Google Fonts CSS `https://fonts.googleapis.com/css2?family=Commissioner:wght@100..900&display=swap`; лицензия из `https://github.com/google/fonts/tree/main/ofl/commissioner`.
- **Лицензия:** SIL Open Font License 1.1.
- **Использование:** бесплатно для публичного сайта при соблюдении OFL.

## IBM Plex Sans

- **Визуальный характер:** инженерный, корпоративный, рациональный sans-serif; хорошо сочетается с технической тематикой.
- **Кириллица:** Google Fonts предоставляет `cyrillic` и `cyrillic-ext` subsets. Подходит для русского UI и технического текста.
- **Рекомендуемая область применения:** инженерный интерфейс, таблицы, справочные блоки, корпоративный product voice.
- **Доступные веса:** `100..700`; Fontconfig распознает Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold.
- **Формат:** variable WOFF2 subsets.
- **Сохраненные файлы:**
  - `ibm-plex-sans/ibm-plex-sans-variable-cyrillic.woff2`
  - `ibm-plex-sans/ibm-plex-sans-variable-cyrillic-ext.woff2`
  - `ibm-plex-sans/OFL.txt`
- **Источник:** Google Fonts CSS `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@100..700&display=swap`; лицензия из `https://github.com/google/fonts/tree/main/ofl/ibmplexsans`.
- **Лицензия:** SIL Open Font License 1.1.
- **Использование:** бесплатно для публичного сайта при соблюдении OFL.

## IBM Plex Mono

- **Визуальный характер:** моноширинный инженерный шрифт с хорошей читаемостью команд, чисел и технических обозначений.
- **Кириллица:** Google Fonts предоставляет `cyrillic` и `cyrillic-ext` subsets для сохраненных начертаний Regular и Medium.
- **Рекомендуемая область применения:** код, команды, координаты, технические подписи, числовые обозначения, но не основной текст интерфейса.
- **Доступные веса в сохраненном наборе:** Regular `400`, Medium `500`. Этого достаточно для предварительного mono-тестирования по требованию задачи.
- **Формат:** static WOFF2 subsets.
- **Сохраненные файлы:**
  - `ibm-plex-mono/ibm-plex-mono-regular-cyrillic.woff2`
  - `ibm-plex-mono/ibm-plex-mono-regular-cyrillic-ext.woff2`
  - `ibm-plex-mono/ibm-plex-mono-medium-cyrillic.woff2`
  - `ibm-plex-mono/ibm-plex-mono-medium-cyrillic-ext.woff2`
  - `ibm-plex-mono/OFL.txt`
- **Источник:** Google Fonts CSS `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap`; лицензия из `https://github.com/google/fonts/tree/main/ofl/ibmplexmono`.
- **Лицензия:** SIL Open Font License 1.1.
- **Использование:** бесплатно для публичного сайта при соблюдении OFL.

## Проверка И Особенности

- Все сохраненные шрифтовые файлы распознаны как `Web Open Font Format (Version 2)`.
- Для Onest, Manrope, Golos Text, Commissioner и IBM Plex Sans сохранены variable WOFF2 subsets с кириллицей.
- Для IBM Plex Mono сохранены static WOFF2 subsets Regular и Medium.
- Неподходящих семейств без WOFF2 с кириллицей на этом этапе не обнаружено.
- Файлы являются Google Fonts subsets. При будущем подключении нужно явно объявить оба subset-файла (`cyrillic` и `cyrillic-ext`) либо заменить их полными self-hosted WOFF2 из официальных репозиториев, если потребуется единый файл без subset-разделения.
- Лицензия OFL не требует оплаты за публичный сайт, но требует сохранения лицензии и соблюдения условий при распространении или модификации шрифтов.
