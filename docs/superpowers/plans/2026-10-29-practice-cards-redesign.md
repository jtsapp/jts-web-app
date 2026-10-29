# «Практика» карточками — план реализации (этап 1)

> Исполнение — инлайн в этой сессии (план и код держит один поток, см. память «субагенты vs инлайн»), одно ревью
> ветки в конце. Спека: `docs/superpowers/specs/2026-10-29-practice-cards-redesign-design.md`.

**Цель:** вкладки «Практики» — сетка карточек одного вида по макету 7393:14225, цвет у каждой вкладки, игры и
«Скорочтение» во вкладке «Грамматика», начисления — аккордеоном, тур под новую раскладку.

**Архитектура:** раскладка (`practiceTabs.js`) → описание карточки по id (`practiceCatalog.js`, чистый) →
`PracticeTile` рисует карточку; `PracticePage` в обзоре рисует группы карточек, в полном списке — прежний
`renderSection`. Цвета — переменные `--pk-*` на классе раздела.

**Стек:** Next.js (SPA в App.jsx), React 19, глобальный CSS, vitest, playwright.

## Ограничения

- JS, не TS; комментарии по-русски, про «почему».
- Ключи вкладок прежние: `listening`, `reading`, `writing`, `speaking`, `grammarGames`.
- Сказки — последние в каждой вкладке.
- Токены на карточке — только из `practiceRules` сервера.
- Шрифт Manrope, интерлиньяж в целых px (`line-height: normal` у Manrope даёт дробные строки).
- Картинки — экспорт Figma, не перерисовка. Цвета тёмной темы — токенами `--dk-*`.
- vitest гонять с `--exclude '.claude/**'` (иначе собирает чужие воркtree).

## Файлы

| Файл | Что |
|---|---|
| `src/screens/practice/practiceTabs.js` | вкладка → группы → id карточек; `skillModules`, `skillOfModule`, `EXPANDABLE`, `skillCards` |
| `src/screens/practice/practiceCatalog.js` (новый) | `cardOf(id)`: обложка, значок, картинка, бейдж, действие, модуль, ключи текста |
| `src/practice/practiceTokens.js` | правила для listenchoose, listening, words, numbers; trainer для writing/reading/situations |
| `src/i18n.jsx` | `practice.card.*`, группы «Грамматики», аккордеон, тур (ru/en/kk) |
| `src/screens/practice/PracticeCards.jsx` | `PracticeTile`, `SkillCard` (новый вид), удалить `Banner`, `ArcadeCard` |
| `src/components/TokenBlocks.jsx` | `PracticeTokenTable` → аккордеон, `PracticeTokenSub` со значком |
| `src/screens/PracticePage.jsx` | обзор группами, список, вкладка «Грамматика» без движка, тур |
| `src/styles.css` | блок `.pk-*`: шапка, вкладки, строка уровней, карточка, группы, аккордеон; удалить баннеры |
| `src/mobile/practice.css` | телефон: вкладки вбок, сетка 2/1, без баннеров |
| `src/theme-dark.css` (+ свой блок в generated) | тёмные `--pk-*` |
| `public/practice/cards/` | коллажи/фото `*.webp`, значки `ico/*.svg` (уже выгружены) |
| тесты | `practiceTabs.test.js`, `practiceCatalog.test.js`, `practiceTokens.test.js`, `PracticePage.*.test.jsx`, e2e Практики и тура |

## Задачи

1. **Раскладка.** Переписать `practiceTabs.js` на группы карточек; `skillModules` — уникальные модули вкладки
   (через `cardOf(id).module`), `skillOfModule` — первая вкладка с модулем. Тест: состав и порядок вкладок как в
   спеке, сказки последние, `skillOfModule('words') === 'grammarGames'`, `skillOfModule('books') === 'reading'`,
   счётчики 7/4/5/6.
2. **Каталог карточек.** `practiceCatalog.js` с таблицей из спеки. Тест: у каждой карточки раскладки есть
   описание; у `list: true` — id из `EXPANDABLE`; у плиток есть значок и файл значка в `public/practice/cards/ico`;
   у коллажей и фото — файл картинки в `public/practice/cards`.
3. **Токены.** Добавить правила и соответствия в `practiceTokens.js`. Тест: `sectionTokenPoints` даёт очки по
   именам правил сервера для новых карточек и 0 для карточек без правила (cartoons, wordhunt).
4. **Словарь.** Названия и описания карточек с макета (ru), en/kk; группы «Тренажёры»/«Игры»; подпись
   «125 тем и игры», «Грамматика»; аккордеон («N пунктов»); тур — 6 шагов.
5. **Карточки.** `PracticeTile` (кнопка, обложка трёх видов, бейдж, тело, чип, стрелка), `SkillCard` со значком;
   удалить `Banner`, `ArcadeCard` и их строки словаря, если не используются.
6. **Аккордеон токенов.** `PracticeTokenTable` свёрнут по умолчанию, шапка с чипом количества; `PracticeTokenSub`
   со значком info.
7. **Страница.** Обзор: группы → сетка `PracticeTile`; клик по списку → `setExpanded(id)`; переходы
   `onNav(nav, payload)`; строка «подпись + уровни»; на «Грамматике» без уровней и без движка; полный список —
   прежние секции с «Свернуть»; тур — новые шаги. Обновить юнит-тесты страницы.
8. **Стили десктопа.** Новый блок `.pk-*`, корневые переменные цвета, показать угол «? · колокольчик · язык»
   на Практике; удалить CSS баннеров/пар/аркады-карточки и старых карточек навыков. Сверка скрином 1440 с макетом.
9. **Телефон.** `src/mobile/practice.css`: вкладки вбок, строка уровней, сетка 2/1; удалить правила баннеров
   обзора. Сверка на 440 и 360.
10. **Тёмная тема.** `--pk-*` для тёмной темы токенами; свой блок в generated.
11. **Проверка и выпуск.** `npm run build` (во временном воркtree), `npm run lint`, vitest, e2e Практики/тура
    (обновить селекторы `.pk-banner__cta` → карточки); абзац в CLAUDE.md; PR в develop + отчёт со скринами.
