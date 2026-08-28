import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildGenre, shuffle } from '../src/practice/writing/engine.js'
import { buildGloss, glossLookup } from '../src/practice/writing/gloss.js'

// Раздел «Письмо» (?screen=writing): каталог уровней → жанры → тренажёр из
// 6 шагов → Блокнот → разбор. Тесты гостевые (без токена) — квоты гостей не
// касаются (usePracticeEntitlement), а «Проверить» уходит в офлайн-проверку
// по правилам без единого сетевого запроса (checkApi.runCheck).
//
// Ожидания заданий НЕ захардкожены: движок жанра детерминирован (seeded),
// поэтому спека собирает жанр тем же buildGenre из тех же JSON и берёт
// правильный порядок слов/верный вариант регистра из него — тест переживает
// правки контента, но упадёт, если сломается сам посев.

const DATA = path.join(__dirname, '..', 'public', 'practice', 'writing')
const a1 = JSON.parse(readFileSync(path.join(DATA, 'a1.json'), 'utf8'))
const meta = JSON.parse(readFileSync(path.join(DATA, 'meta.json'), 'utf8'))
const genre = buildGenre(a1.seeds.find((s) => s.id === 'a1-form'), a1.bank, meta)

const GENRE_TITLE = 'About me: a form'
const SENT = 'My favourite subject is English.'
const wo = genre.tasks.find((t) => t.type === 'word-order')
const woIdx = wo.items.findIndex((it) => it.words.join(' ') === SENT)
const woItem = wo.items[woIdx]
// Порядок фишек в банке — тот же сид, что в WordOrderItem (task.id + item.id).
const woBank = woItem ? shuffle(woItem.words, wo.id + woItem.id) : []

const rg = genre.tasks.find((t) => t.type === 'register')
const rgItem = rg.items[0]
const rgWrong = rgItem.answer === 'a' ? rgItem.b : rgItem.a

// Реальные строки i18n (src/i18n.jsx, ключи writing.fb.*) — контракт
// «ответ не показывается»: только правило и ещё одна попытка.
const TRY_NOTE = 'Попробуй ещё раз — ответа здесь нет. Правило выше говорит, что нужно поменять.'
const LAST_NOTE = 'Этот пункт пока не решён. Открой упражнение позже и попробуй снова.'

const exact = (w) => new RegExp('^' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')

const openLevels = async (page) => {
  await page.goto('/?screen=writing')
  // Диплинк применяется эффектом после гидратации — ждём заголовок каталога.
  await expect(page.locator('.wr-hero h1')).toHaveText('Учимся писать по-английски — по шагам', {
    timeout: 15000,
  })
}

const openTrainer = async (page) => {
  await openLevels(page)
  await page.locator('.wr-lvcard').first().click()
  await expect(page.locator('.wr-gncard')).toHaveCount(30, { timeout: 15000 })
  await page.locator('.wr-gncard', { hasText: GENRE_TITLE }).click()
  await expect(page.locator('.wr-stepchip')).toHaveCount(6)
}

const openStep4 = async (page) => {
  await openTrainer(page)
  await page.locator('.wr-stepchip', { hasText: 'Уровень предложения' }).click()
  await expect(page.locator('#task-t1')).toBeVisible()
}

test.describe('Письмо — каталог, тренажёр, Блокнот, разбор', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 760, 'только широкий вьюпорт')

  test('каталог: уровни → жанры → тренажёр из 6 шагов', async ({ page }) => {
    await openLevels(page)
    await expect(page.locator('.wr-lvcard')).toHaveCount(6)
    await expect(page.locator('.wr-lvcard .wr-lvcard__tag')).toHaveText([
      'A1', 'A2', 'A2+', 'B1', 'B2', 'C1',
    ])
    await expect(page.getByRole('button', { name: 'Открыть Блокнот' })).toBeVisible()

    await page.locator('.wr-lvcard').first().click()
    await expect(page.locator('.wr-gncard')).toHaveCount(30, { timeout: 15000 })
    await expect(page.locator('.wr-gncard').first()).toContainText(GENRE_TITLE)

    await page.locator('.wr-gncard').first().click()
    const chips = page.locator('.wr-stepchip')
    await expect(chips).toHaveCount(6)
    await expect(chips).toContainText([
      'Зачем это нужно', 'Лексика и фразы', 'Связки', 'Уровень предложения', 'План', 'Свой текст',
    ])
    // Шаг 1 открыт по умолчанию, футер зовёт дальше.
    await expect(page.getByText('Зачем тебе этот жанр')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Дальше →' })).toBeVisible()
  })

  test('word-order: сид банка стабилен, «Верно.» за верный порядок, ответ не раскрывается', async ({ page }) => {
    expect(woIdx).toBeGreaterThanOrEqual(0) // предложение-эталон есть в подборке жанра
    await openStep4(page)
    await expect(page.locator('[id^="task-t"]')).toHaveCount(6)
    const card = page.locator('#task-t1')
    await expect(card.locator('h3')).toHaveText('Собери предложение')

    const item = card.locator('.wr-item').nth(woIdx)
    await item.scrollIntoViewIfNeeded()
    // Детерминированный порядок фишек: совпадает с расчётом движка (seeded).
    await expect(item.locator('.wr-chipbank .wr-chip')).toHaveText(woBank)

    // Неверный порядок (последнее слово вперёд): фидбэк с правилом и нотой
    // «попробуй ещё раз», но БЕЗ текста правильного ответа.
    const wrongOrder = [woItem.words[woItem.words.length - 1], ...woItem.words.slice(0, -1)]
    for (const w of wrongOrder) {
      await item.locator('.wr-chipbank .wr-chip').filter({ hasText: exact(w) }).click()
    }
    const fb = item.locator('.wr-fb')
    await expect(fb).toContainText('Не совсем.')
    await expect(fb).toContainText(woItem.why)
    await expect(fb).toContainText(TRY_NOTE)
    await expect(fb).not.toContainText(SENT)
    // Ретрай вернул фишки в банк — строка сборки снова пустая.
    await expect(item.locator('.wr-ph')).toBeVisible()

    // Верный порядок: авто-судейство, «Верно.» + правило.
    for (const w of woItem.words) {
      await item.locator('.wr-chipbank .wr-chip').filter({ hasText: exact(w) }).click()
    }
    await expect(item.locator('.wr-fb--ok')).toContainText('Верно.')
    await expect(item.locator('.wr-fb--ok')).toContainText(woItem.why)
  })

  test('register: три неверных клика — две ноты «попробуй ещё» и финальная «пока не решён»', async ({ page }) => {
    await openStep4(page)
    const card = page.locator('#task-t6')
    await card.scrollIntoViewIfNeeded()
    await expect(card.locator('h3')).toHaveText('Кому ты это пишешь?')

    const item = card.locator('.wr-item').first()
    await expect(item.locator('.wr-opt')).toHaveCount(2)
    const wrongBtn = item.locator('.wr-opt').filter({ hasText: exact(rgWrong) })

    // 1-я и 2-я неверные попытки — «Не совсем.» + правило + «попробуй ещё раз».
    await wrongBtn.click()
    const fb = item.locator('.wr-fb')
    await expect(fb).toContainText('Не совсем.')
    await expect(fb).toContainText(rgItem.why)
    await expect(fb).toContainText(TRY_NOTE)
    await wrongBtn.click()
    await expect(fb).toContainText(TRY_NOTE)

    // 3-я — пункт закрывается неверным: нота «пока не решён», варианты гаснут.
    await wrongBtn.click()
    await expect(fb).toContainText(LAST_NOTE)
    await expect(item.locator('.wr-opt').first()).toBeDisabled()
    await expect(item.locator('.wr-opt').nth(1)).toBeDisabled()
  })

  test('Блокнот: черновик переживает перезагрузку (автосейв в localStorage)', async ({ page }) => {
    const TEXT = 'My name is Aizere and I live in Almaty city'
    await openTrainer(page)
    await page.locator('.wr-stepchip', { hasText: 'Свой текст' }).click()
    await page.getByRole('button', { name: 'Писать в Блокноте' }).click()

    const editor = page.locator('.wr-editor')
    await expect(editor).toBeVisible()
    await editor.click()
    await editor.pressSequentially(TEXT)
    // Автосейв тикает раз в 3 секунды — «Сохранено в …» и есть сигнал персиста.
    await expect(page.locator('.wr-savedline')).toBeVisible({ timeout: 6000 })

    // Перезагрузка сбрасывает view-машину на каталог — идём тем же путём назад.
    await page.reload()
    await expect(page.locator('.wr-hero h1')).toHaveText('Учимся писать по-английски — по шагам', {
      timeout: 15000,
    })
    await page.locator('.wr-lvcard').first().click()
    await expect(page.locator('.wr-gncard')).toHaveCount(30, { timeout: 15000 })
    await page.locator('.wr-gncard', { hasText: GENRE_TITLE }).click()
    await page.locator('.wr-stepchip', { hasText: 'Свой текст' }).click()
    await page.getByRole('button', { name: 'Писать в Блокноте' }).click()
    await expect(page.locator('.wr-editor')).toContainText(TEXT)
  })

  test('гость: «Проверить» — офлайн-разбор без сети, подсветка открывает модалку', async ({ page }) => {
    await openLevels(page)
    await page.getByRole('button', { name: 'Открыть Блокнот' }).click()
    const editor = page.locator('.wr-editor')
    await expect(editor).toBeVisible()

    // «very like» гарантирует хотя бы одну правку (L1_RULES в localCheck.js).
    await editor.click()
    await editor.pressSequentially('I very like my city and I want to tell you about my life here.')

    // Гостевая проверка обязана быть локальной: на /api/writing/check ни запроса.
    const apiCalls = []
    page.on('request', (r) => {
      if (r.url().includes('/api/writing/check')) apiCalls.push(r.url())
    })
    await page.getByRole('button', { name: 'Проверить' }).click()

    await expect(page.locator('.wr-res-head h2')).toHaveText('Разбор твоей работы')
    await expect(page.locator('.wr-res-head .wr-pill')).toHaveText('офлайн-проверка по правилам')
    await expect(page.locator('.wr-res-ringwrap')).toHaveCount(4)
    await expect(page.getByText('Три шага к следующему уровню')).toBeVisible()
    const corr = page.locator('.wr-res-item').first()
    await expect(corr).toContainText('very like')
    await expect(corr).toContainText('really like')
    expect(apiCalls).toEqual([])

    // Пометка в тексте → модалка «было/стало» → закрытие крестиком.
    await page.locator('.wr-hl').first().click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('было:')
    await expect(modal).toContainText('very like')
    await expect(modal).toContainText('стало:')
    await expect(modal).toContainText('really like')
    await modal.locator('.wr-modal__x').click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

/* ────────────────────── выделение и перевод (тап + драг) ─────────────────── */

// Регрессия на жалобу «очень сложно выделяется, буквально на рандом». Причин
// у неё оказалось две, и обе не в хуке перевода:
//
// 1. Каскад: глобальный анти-копирующий запрет `[data-selectable] button`
//    (styles.css, специфичность 0,1,1) гасил выделение внутри кнопок — а в этом
//    разделе в кнопках лежит половина учебного текста (слова-чипы, варианты
//    ответа, плитки, строки банка). Лечится префиксом `.wr` в writing.css.
// 2. NoCopyGuard (app/providers.jsx): цель `selectstart` — ТЕКСТОВЫЙ узел,
//    когда мышь нажали прямо на буквах, а у него нет closest(); проверка
//    `[data-selectable]` молча проваливалась в preventDefault. То есть
//    выделение начиналось, только если попасть мимо букв — в padding или в
//    промежуток между словами. Вот это и есть «рандом» в чистом виде.
//
// Вторую дырку маскировал тап по слову: карточка перевода всё равно
// появлялась, просто с одним словом вместо фразы. Поэтому её ловит только
// протаскивание по двум словам сразу — тест «выделяет фразу целиком».

const gloss = buildGloss(a1)

// Слова, перевод которых уже лежит в глоссарии уровня (buildGloss читает
// words/phr всех сидов), — тултип тогда отвечает без сети, и тест офлайновый.
// Берём их из тех же данных, что и остальная спека: правка контента не ломает
// тест, пока в абзаце и в word-order есть хоть одно знакомое слово.
const inGloss = (w) => (/^[A-Za-z]+$/.test(w) ? glossLookup(gloss, w) : null)

const PROSE = (() => {
  for (const w of String(genre.why).split(/[^A-Za-z]+/)) {
    const tr = inGloss(w)
    if (tr) return { word: w, tr }
  }
  return null
})()

const CHIP = (() => {
  for (let i = 0; i < wo.items.length; i++) {
    for (const w of wo.items[i].words) {
      const tr = inGloss(w)
      if (tr) return { idx: i, word: w, tr }
    }
  }
  return null
})()

// Два соседних слова без пунктуации между ними — фраза для протаскивания.
const PHRASE = (String(genre.why).match(/[A-Za-z]+ [A-Za-z]+/) || [null])[0]

// Прямоугольник СЛОВА (или фразы) внутри элемента, а не самой кнопки: и тап
// (хук берёт слово из точки через caretRangeFromPoint), и честное
// протаскивание мышью целятся именно в буквы. Берём только вхождение, целиком
// уместившееся в одну строку (getClientRects === 1) — у перенесённого куска
// bounding-box накрывает обе строки, и мышь ушла бы мимо текста.
async function wordBox(locator, word) {
  await locator.scrollIntoViewIfNeeded()
  const r = await locator.evaluate((host, w) => {
    const walk = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const txt = n.textContent || ''
      for (let i = txt.indexOf(w); i >= 0; i = txt.indexOf(w, i + 1)) {
        const range = document.createRange()
        range.setStart(n, i)
        range.setEnd(n, i + w.length)
        const b = range.getBoundingClientRect()
        if (b.width && range.getClientRects().length === 1) {
          return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }
        }
      }
    }
    return null
  }, word)
  expect(r, `«${word}» не нашлось одной строкой внутри элемента`).toBeTruthy()
  return { ...r, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 }
}

// Честный жест выделения: нажать на первой букве, протащить до последней,
// отпустить там же. Именно он ломался — Chrome шлёт selectstart в ТЕКСТОВЫЙ
// узел, и NoCopyGuard гасил его, если нажатие пришлось на буквы.
async function dragOver(page, box) {
  await page.mouse.move(box.left + 2, box.cy)
  await page.mouse.down()
  await page.mouse.move(box.right - 2, box.cy, { steps: 12 })
  await page.mouse.up()
}

// Гость идёт мимо /api/writing/translate (роут требует Bearer) прямо в gtx
// (lib/wordTranslate.js). Слова тестов есть в глоссарии, поэтому внешнего
// запроса быть не должно вовсе; блокировка делает тест независимым от сети, а
// счётчик ловит регрессию glossLookup.
async function blockGtx(page) {
  const calls = []
  await page.route('**/translate_a/single**', (route) => {
    calls.push(route.request().url())
    return route.abort()
  })
  return calls
}

async function expectTip(page, word, tr) {
  const tip = page.locator('.wr-tpop')
  // .wr-tpop живёт в body всегда и показывается только классом on.
  await expect(tip).toBeVisible()
  await expect(tip).toHaveClass(/(^|\s)on(\s|$)/)
  await expect(tip.locator('.wr-tpop__en')).toHaveText(word)
  const lines = tip.locator('.wr-tpop__line')
  await expect(lines).toHaveCount(2)
  await expect(lines.nth(0).locator('.wr-tpop__lang')).toHaveText('RU')
  await expect(lines.nth(0)).toContainText(tr.ru)
  await expect(lines.nth(1).locator('.wr-tpop__lang')).toHaveText('KK')
  await expect(lines.nth(1)).toContainText(tr.kk)
  // src:'word' → подпись «из этого жанра»: перевод пришёл из глоссария, не из сети.
  await expect(tip.locator('.wr-tpop__foot')).toContainText('из этого жанра')
}

test.describe('Письмо — выделение и перевод', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 760, 'только широкий вьюпорт')

  test('тап по слову в абзаце: выделяется ровно оно, тултип даёт RU и KK без сети', async ({ page }) => {
    expect(PROSE, 'в абзаце жанра нет ни одного слова из глоссария уровня').toBeTruthy()
    const gtx = await blockGtx(page)
    await openTrainer(page)

    // Абзац «зачем этот жанр» — обычный текст вне кнопок (шаг 1 открыт сразу).
    const why = page.locator('.wr-card p', { hasText: genre.why })
    await expect(why).toHaveCount(1)
    const box = await wordBox(why, PROSE.word)
    await page.mouse.click(box.cx, box.cy)

    await expectTip(page, PROSE.word, PROSE.tr)
    // Границы слова ищет selectWordAt по caret-API: ни соседних слов, ни знаков.
    await expect
      .poll(() => page.evaluate(() => String(window.getSelection())))
      .toBe(PROSE.word)
    expect(gtx, 'перевод должен прийти из глоссария, а не из gtx').toEqual([])
  })

  // Единственный жест, который НЕ подстрахован тапом: в абзаце выделение двух
  // слов сразу. Пока selectstart на текстовом узле гасился (providers.jsx), тап
  // по одному слову маскировал поломку — карточка всё равно появлялась, просто
  // с одним словом вместо фразы, и «выделение» выглядело работающим. Этот тест
  // ловит именно ту дырку: если проверка `[data-selectable]` снова начнёт
  // спотыкаться о текстовый узел, выделения не будет вовсе.
  test('протаскивание по абзацу выделяет фразу целиком, а не одно слово', async ({ page }) => {
    expect(PHRASE, 'в абзаце жанра нет двух слов подряд без пунктуации').toBeTruthy()
    // Фраза в глоссарии не лежит — перевод уйдёт в gtx; сеть глушим, важно
    // только то, что выделение состоялось и фраза дошла до каскада перевода.
    const gtx = await blockGtx(page)
    await openTrainer(page)

    const why = page.locator('.wr-card p', { hasText: genre.why })
    await dragOver(page, await wordBox(why, PHRASE))

    expect(await page.evaluate(() => String(window.getSelection()))).toBe(PHRASE)
    const tip = page.locator('.wr-tpop')
    await expect(tip).toBeVisible()
    await expect(tip.locator('.wr-tpop__en')).toHaveText(PHRASE)
    await expect.poll(() => gtx.length).toBeGreaterThan(0)
  })

  test('user-select: учебный текст в кнопках выделяем, служебные кнопки — нет', async ({ page }) => {
    await openStep4(page)
    const userSelect = (sel) =>
      page
        .locator(sel)
        .first()
        .evaluate((el) => {
          const cs = getComputedStyle(el)
          return cs.userSelect || cs.webkitUserSelect
        })

    // Если из селекторов writing.css уберут префикс `.wr`, специфичности не
    // хватит против `[data-selectable] button` и здесь снова будет 'none'.
    expect(await userSelect('.wr-opt'), '.wr-opt').toBe('text')
    // Обратная сторона починки: подписи навигации выделять незачем, общий
    // запрет копирования на них остаётся.
    expect(await userSelect('.wr-stepchip'), '.wr-stepchip').toBe('none')
    // Слова-фишки самих упражнений — исключение: это варианты ответа, их
    // перевод был бы подсказкой (см. .wr-chip--task в writing.css).
    expect(await userSelect('.wr-chip--task'), '.wr-chip--task').toBe('none')
  })

  test('справочные фишки (таблица связок на шаге 3) переводятся: они не ответ', async ({ page }) => {
    await openTrainer(page)
    await page.locator('.wr-stepchip', { hasText: 'Связки' }).click()
    const chip = page.locator('.wr-tbl .wr-chip').first()
    await expect(chip).toBeVisible()
    // Модификатора задания на них нет — значит и запрет не действует.
    await expect(chip).not.toHaveClass(/wr-chip--task/)
    expect(
      await chip.evaluate((el) => {
        const cs = getComputedStyle(el)
        return cs.userSelect || cs.webkitUserSelect
      }),
    ).toBe('text')
  })

  test('клик по чипу без выделения — обычный ход: слово встаёт в строку сборки', async ({ page }) => {
    expect(CHIP, 'в word-order нет слова из глоссария уровня').toBeTruthy()
    await openStep4(page)
    const item = page.locator('#task-t1 .wr-item').nth(CHIP.idx)
    await item.scrollIntoViewIfNeeded()
    await expect(item.locator('.wr-ph')).toBeVisible()

    await item.locator('.wr-chipbank .wr-chip').filter({ hasText: exact(CHIP.word) }).click()
    await expect(item.locator('.wr-slotline')).toContainText(CHIP.word)
    await expect(item.locator('.wr-ph')).toHaveCount(0)
  })

  test('слово-фишку упражнения протаскиванием не выделить и не перевести', async ({ page }) => {
    expect(CHIP).toBeTruthy()
    const gtx = await blockGtx(page)
    await openStep4(page)
    const item = page.locator('#task-t1 .wr-item').nth(CHIP.idx)
    await item.scrollIntoViewIfNeeded()
    const chip = item.locator('.wr-chipbank .wr-chip').filter({ hasText: exact(CHIP.word) })
    const box = await wordBox(chip, CHIP.word)

    await dragOver(page, box)

    // Ни выделения, ни карточки: фишка — вариант ответа, её перевод был бы
    // подсказкой, а копировать варианты незачем.
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => String(window.getSelection()))).toBe('')
    await expect(page.locator('.wr-tpop')).toBeHidden()
    expect(gtx).toEqual([])
  })

  test('тап по чипу тултип не открывает: клик там — ход, а не перевод', async ({ page }) => {
    expect(CHIP).toBeTruthy()
    await openStep4(page)
    const item = page.locator('#task-t1 .wr-item').nth(CHIP.idx)
    await item.scrollIntoViewIfNeeded()
    const chip = item.locator('.wr-chipbank .wr-chip').filter({ hasText: exact(CHIP.word) })
    const box = await wordBox(chip, CHIP.word)
    await page.mouse.click(box.cx, box.cy)

    // Клик реально дошёл до упражнения — значит проверяем именно перехват тапа.
    await expect(item.locator('.wr-slotline')).toContainText(CHIP.word)
    // Показ тултипа отложен на 10 мс (браузер успевает зафиксировать
    // выделение) — ждём с запасом, иначе «не появился» пройдёт просто потому,
    // что не успел.
    await page.waitForTimeout(300)
    await expect(page.locator('.wr-tpop')).toBeHidden()
    expect(await page.evaluate(() => String(window.getSelection()))).toBe('')
  })
})
