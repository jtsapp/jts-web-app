import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildQueue, formsOf, pattern } from '../src/practice/verbs/engine.js'

// Раздел «Неправильные глаголы» (?screen=verbs): урок → таблица → тренажёр.
// Тесты гостевые (без токена): раздел бесплатный, прогресс живёт в
// localStorage, записи и словарь — статика.
//
// Ожидания не захардкожены: спека читает тот же verbs.json, что и
// приложение, и тот же движок строит очередь. Правку контента тест переживёт,
// а разъехавшийся экран — нет.

const DATA = JSON.parse(readFileSync(path.join(__dirname, '..', 'public', 'practice', 'verbs', 'verbs.json'), 'utf8'))
const BY = Object.fromEntries(DATA.verbs.map((v) => [v.v1, v]))
// Очередь по умолчанию: A1, три формы, все глаголы, без перемешивания.
const queue = (mode, formCount = 3) => buildQueue(DATA, { mode, level: 'A1', formCount }).queue

const open = async (page, part) => {
  await page.goto(`/?screen=verbs&part=${part}`)
  // Диплинк применяется эффектом ПОСЛЕ гидратации — ждём шапку главы.
  await expect(page.locator('.vb-head h1')).toHaveText('Неправильные глаголы', { timeout: 15000 })
}

const pickMode = async (page, id) => {
  await page.locator(`#vb-mode-${id}`).click()
  await expect(page.locator(`#vb-mode-${id}`)).toHaveAttribute('aria-selected', 'true')
}

// На телефоне уровень, формы и набор свёрнуты в строку-сводку — раскрываем.
// isVisible не ждёт: сначала дожидаемся самой практики (данные грузятся).
const openSetup = async (page) => {
  await expect(page.locator('.vb-modes')).toBeVisible({ timeout: 15000 })
  const edit = page.locator('.vb-setupbar .vb-btn')
  if (await edit.isVisible()) await edit.click()
}

// Браузер без распознавания речи (Firefox, встроенные браузеры приложений).
const withoutSpeechRecognition = (page) =>
  page.addInitScript(() => {
    for (const k of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      Object.defineProperty(window, k, { value: undefined, configurable: true, writable: true })
    }
  })

test.describe('урок', () => {
  test('мини-тест отмечает верный и неверный ответ с правилом', async ({ page }) => {
    await open(page, 'learn')
    const q1 = page.locator('.vb-quiz').nth(0)
    await q1.locator('.vb-choice', { hasText: 'went' }).click()
    await expect(q1.locator('.vb-choice.is-correct')).toHaveText('went')
    await expect(q1.locator('.vb-quiz__fb')).toContainText('Верно')
    const q2 = page.locator('.vb-quiz').nth(1)
    await q2.locator('.vb-choice', { hasText: 'saw' }).click()
    await expect(q2.locator('.vb-choice.is-wrong')).toHaveText('saw')
  })

  test('«открыть схему в таблице» ведёт в таблицу с фильтром по схеме', async ({ page }) => {
    await open(page, 'learn')
    const card = page.locator('.vb-pattern').filter({ hasText: 'ABB' })
    await card.locator('summary').click()
    await card.locator('.vb-link').click()
    await expect(page.locator('#vb-tab-table')).toHaveAttribute('aria-selected', 'true')
    const abb = DATA.verbs.filter((v) => pattern(v) === 'ABB')
    await expect(page.locator('.vb-filters__count')).toHaveText(`${abb.length} из ${DATA.verbs.length} глаголов`)
  })
})

test.describe('таблица', () => {
  test('поиск по трём языкам сужает таблицу', async ({ page }) => {
    await open(page, 'table')
    await expect(page.locator('.vb-table tbody tr')).toHaveCount(DATA.verbs.length)
    await page.locator('.vb-search input').fill('бару')
    await expect(page.locator('.vb-table tbody tr')).toHaveCount(1)
    await expect(page.locator('.vb-table tbody tr td').first()).toContainText('go')
  })

  test('«скрыть V2 и V3» прячет формы, клетка открывается по одной', async ({ page }) => {
    await open(page, 'table')
    await page.locator('.vb-search input').fill('ought')
    await page.getByText('Скрыть V2 и V3').click()
    const row = page.locator('.vb-table tr', { hasText: 'bring' })
    await expect(row.locator('.vb-hidden')).toHaveCount(2)
    await row.locator('.vb-hidden').first().click()
    await expect(row.locator('.vb-revealed')).toHaveText(BY.bring.v2)
    await expect(row.locator('.vb-hidden')).toHaveCount(1)
  })

  test('звёздочка сохраняет глагол в «потренировать позже»', async ({ page }) => {
    await open(page, 'table')
    const row = page.locator('.vb-table tr', { hasText: 'think' })
    await row.locator('.vb-icon-btn').nth(1).click()
    await expect(row.locator('.vb-icon-btn').nth(1)).toHaveAttribute('aria-pressed', 'true')
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('jts_verbs_done')).saved)
    expect(saved).toEqual({ think: true })
    await page.locator('.vb-filters .vb-check', { hasText: 'Повторить позже' }).locator('input').check()
    await expect(page.locator('.vb-table tbody tr')).toHaveCount(1)
  })

  // Семь колонок шире телефона: перевод и кнопки уезжали вбок в каждой группе.
  test('на телефоне строка глагола — карточка без прокрутки вбок', async ({ page, viewport }) => {
    test.skip(viewport.width > 640, 'раскладка телефона')
    await open(page, 'table')
    const row = page.locator('.vb-table tbody tr', { hasText: 'think' }).first()
    await row.scrollIntoViewIfNeeded()
    for (const cell of [row.locator('td[lang="ru"]'), row.locator('.vb-icon-btn').nth(1)]) {
      const box = await cell.boundingBox()
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
    }
    await expect(row.locator('td[lang="ru"]')).toHaveText(BY.think.ru)
    await expect(page.locator('.vb-scroll-hint').first()).toBeHidden()
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll('.vb-table tbody tr')].filter((tr) => tr.getBoundingClientRect().right > innerWidth).length,
    )
    expect(wide).toBe(0)
  })

  test('прослушивание группы грузит записи форм и подсвечивает строку', async ({ page }) => {
    await open(page, 'table')
    const group = page.locator('.vb-group').first()
    const first = DATA.verbs.find((v) => v.group === DATA.groups[0])
    const wav = page.waitForResponse((r) => r.url().includes(`/practice/verbs/audio/${first.v1}.wav`))
    await group.locator('.vb-group__head .vb-btn').click()
    expect((await wav).status()).toBe(200)
    await expect(page.locator('.vb-listen__row strong')).toHaveText(formsOf(first).join(' → '))
    await expect(page.locator('.vb-table tr.is-playing')).toHaveCount(1)
    await page.locator('.vb-listen__now .vb-btn', { hasText: 'Остановить' }).click()
    await expect(page.locator('.vb-listen__now')).toHaveCount(0)
  })
})

test.describe('практика: письмо', () => {
  test('«напиши формы»: верный ответ засчитан, неверный — с правильной формой', async ({ page }) => {
    await open(page, 'practice')
    await pickMode(page, 'write')
    const v = BY[queue('write')[0].verb]
    const inputs = page.locator('.vb-answer')
    await inputs.nth(0).fill(v.v2.split(' / ')[0])
    await inputs.nth(1).fill(v.v1 + 'ed')
    await inputs.nth(1).press('Enter')
    await expect(inputs.nth(0)).toHaveClass(/is-correct/)
    await expect(inputs.nth(1)).toHaveClass(/is-wrong/)
    await expect(page.locator('.vb-answerrow').nth(1).locator('strong')).toHaveText(v.v3)
    await page.locator('.vb-result-actions .vb-btn', { hasText: 'Следующая строка' }).click()
    await expect(page.locator('.vb-prompt strong')).toHaveText(queue('write')[1].verb)
  })

  test('пустой ответ не проверяется — просьба написать', async ({ page }) => {
    await open(page, 'practice')
    await pickMode(page, 'write')
    await page.locator('.vb-form .vb-btn', { hasText: 'Проверить' }).click()
    await expect(page.locator('.vb-notice')).toContainText('Сначала')
    await expect(page.locator('.vb-feedback')).toHaveCount(0)
  })

  test('«вставь в предложение»: тап по слову даёт перевод из словаря раздела', async ({ page }) => {
    await open(page, 'practice')
    await pickMode(page, 'sentence')
    const it = queue('sentence')[0]
    await expect(page.locator('.vb-prompt')).toContainText(it.text.replace('____', '').split(' ').filter(Boolean)[0])
    const word = it.text.split(/\s+/).find((w) => /yesterday/i.test(w)) || it.text.split(/\s+/).find((w) => DATA.dict[w.toLowerCase().replace(/[^a-z']/g, '')])
    await page.locator('.vb-w', { hasText: word }).first().click()
    const entry = DATA.dict[word.toLowerCase().replace(/[^a-z']/g, '')]
    await expect(page.locator('.vb-pop')).toContainText(entry.ru)
    await expect(page.locator('.vb-pop')).toContainText(entry.kk)
    await page.keyboard.press('Escape')
    await expect(page.locator('.vb-pop')).toHaveCount(0)
    await page.locator('.vb-answer').fill(formsOf(BY[it.verb])[it.form].split(' / ')[0])
    await page.locator('.vb-answer').press('Enter')
    await expect(page.locator('.vb-answer')).toHaveClass(/is-correct/)
  })

  // Что слова нажимаются, раньше не было видно ничем, а карточка перевода
  // вставала под словом — прямо на поле ответа.
  test('слова помечены подсказкой, карточка перевода — над предложением, поле ответа открыто', async ({ page }) => {
    await open(page, 'practice')
    await pickMode(page, 'sentence')
    await expect(page.locator('.vb-taphint')).toHaveText('Нажми на слово — переведу')
    const word = page.locator('.vb-w').last()
    // Посередине экрана: у верхнего края карточка законно уходит вниз.
    await word.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await word.click()
    const pop = await page.locator('.vb-pop').boundingBox()
    const sentence = await page.locator('.vb-prompt').boundingBox()
    const input = await page.locator('.vb-answer').boundingBox()
    // Предложение целиком видно рядом с переводом, поле ответа не закрыто.
    expect(pop.y + pop.height).toBeLessThanOrEqual(sentence.y)
    expect(pop.y + pop.height).toBeLessThanOrEqual(input.y)
    await page.keyboard.press('Escape') // на телефоне открытая карточка лежит поверх ленты режимов
    await pickMode(page, 'write')
    await expect(page.locator('.vb-taphint')).toHaveCount(0) // у V1 без предложения тапать нечего
  })

  test('«исправь ошибку»: «показать ответ» — самопроверка без балла, в конце итог', async ({ page }) => {
    await open(page, 'practice')
    await openSetup(page)
    await page.locator('.vb-scope select').nth(1).selectOption('10')
    await pickMode(page, 'fix')
    await expect(page.locator('.vb-prompt mark')).toBeVisible()
    for (let i = 0; i < 10; i++) {
      await page.locator('.vb-form .vb-btn', { hasText: 'Показать ответ' }).click()
      await expect(page.locator('.vb-answerrow').first()).toContainText('самопроверка')
      await page.locator('.vb-result-actions .vb-btn').last().click()
    }
    await expect(page.locator('.vb-finish')).toHaveText('10 / 10')
    await expect(page.locator('.vb-stage')).toContainText('Верно 0 / 10')
  })
})

test.describe('практика: ритм', () => {
  test.slow()

  test('«слушай и повторяй»: тьютор на бит, твоя очередь, самопроверка в прогресс', async ({ page }) => {
    await open(page, 'practice')
    const first = queue('repeat')[0].verb
    await expect(page.locator('.vb-tile span')).toHaveText(formsOf(BY[first]).map((f) => f.split(' / ')[0]))
    await page.locator('.vb-stack .vb-btn', { hasText: 'Слушать и повторять под бит' }).click()
    await expect(page.locator('.vb-phases .is-on')).toHaveText('Слушай')
    // Тьютор ждёт начала такта и играет три доли — до «твоей очереди» 2–6 с.
    const done = page.locator('.vb-stage .vb-btn', { hasText: 'Я повторил(а)' })
    await expect(done).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.vb-tile.is-on')).toHaveCount(1, { timeout: 5000 })
    await done.click()
    await expect(page.locator('.vb-stage h3')).toHaveText('Самопроверка · без оценки речи')
    await expect(page.locator('.vb-progress__verb').first().locator('.vb-progress__mark')).toHaveText('✓')
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('jts_verbs_done')).progress)
    expect(progress['practice-v4-repeat-3-A1'][first]).toMatchObject({ done: true, kind: 'manual', attempts: 1 })
  })

  // Прототип писал в покое «Бит: выключен», хотя попытка стартовала с битом:
  // тумблер показывал, звучит ли бит сейчас. Теперь он — настройка.
  test('тумблер бита — настройка, послушать бит — отдельная кнопка', async ({ page }) => {
    await open(page, 'practice')
    const toggle = page.locator('.vb-beat__toggle')
    const preview = page.locator('.vb-beat__preview')
    await expect(toggle).toHaveText('Бит: включён')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.vb-rhythm__label')).toContainText('96 BPM')

    await preview.click()
    await expect(preview).toHaveText('Остановить бит')
    await expect(toggle).toHaveText('Бит: включён') // предпрослушка настройку не трогает
    await preview.click()
    await expect(preview).toHaveText('Послушать бит')

    await toggle.click()
    await expect(toggle).toHaveText('Бит: выключен')
    await expect(page.locator('.vb-rhythm__label')).toContainText('Беззвучный ориентир')
    const beat = await page.evaluate(() => JSON.parse(localStorage.getItem('jts_verbs_settings')).beat)
    expect(beat).toBe(false)
    await page.reload()
    await expect(page.locator('.vb-beat__toggle')).toHaveText('Бит: выключен', { timeout: 15000 })
  })

  // Раньше кнопка микрофона была всегда, и что распознавания нет, ученик
  // узнавал только после нажатия — из сообщения с бесполезным «Повторить».
  test('без распознавания речи кнопок микрофона нет — сразу путь без него', async ({ page }) => {
    await withoutSpeechRecognition(page)
    await open(page, 'practice')
    const stage = page.locator('.vb-stage')
    await expect(stage.locator('.vb-btn')).toHaveText(['Слушать и повторять под бит'])
    await expect(stage.locator('.vb-nomic')).toContainText('повторяй вслух')
    await expect(page.locator('.vb-scoring')).toHaveCount(0)

    await pickMode(page, 'gap')
    await expect(stage.locator('.vb-btn')).toHaveText(['Показать ответ'])
    await expect(stage.locator('.vb-nomic')).toContainText('«Показать ответ»')
    await expect(page.locator('.vb-instruction')).not.toContainText('микрофон')
    await stage.locator('.vb-btn').click()
    await expect(stage.locator('h3')).toHaveText('Самопроверка · без оценки речи')
  })

  test('«этот режим без звука» — только у пропущенной формы', async ({ page }) => {
    await open(page, 'practice')
    await pickMode(page, 'gap')
    await expect(page.locator('.vb-silent')).toHaveText('Этот режим без звука')
    for (const m of ['write', 'sentence', 'fix']) {
      await pickMode(page, m)
      await expect(page.locator('.vb-silent')).toHaveCount(0)
    }
  })
})

test.describe('практика: раскладка', () => {
  // На телефоне до упражнения было почти два экрана настроек.
  test('телефон: настройки — строка-сводка, упражнение на первом экране', async ({ page, viewport }) => {
    test.skip(viewport.width > 560, 'раскладка телефона')
    await open(page, 'practice')
    const bar = page.locator('.vb-setupbar')
    await expect(bar).toContainText('A1 · 3 формы · Все 90 глаголов')
    await expect(page.locator('.vb-levels')).toBeHidden()
    const drill = await page.locator('.vb-drill').boundingBox()
    expect(drill.y).toBeLessThan(viewport.height)

    await bar.locator('.vb-btn').click()
    await expect(bar.locator('.vb-btn')).toHaveText('Готово')
    await page.locator('.vb-levels button', { hasText: 'A2' }).click()
    await expect(bar).toContainText('A2 · 3 формы')
    await bar.locator('.vb-btn').click()
    await expect(page.locator('.vb-levels')).toBeHidden()

    // Режимы — лента вбок: пятый режим за краем, но нажимается.
    await pickMode(page, 'fix')
    await expect(page.locator('.vb-prompt mark')).toBeVisible()
  })

  test('десктоп: настройки открыты, строки-сводки нет', async ({ page, viewport }) => {
    test.skip(viewport.width <= 560, 'раскладка десктопа')
    await open(page, 'practice')
    await expect(page.locator('.vb-setupbar')).toBeHidden()
    await expect(page.locator('.vb-levels')).toBeVisible()
  })
})

test.describe('хаб Практики', () => {
  test('баннер и чип ведут в раздел', async ({ page }) => {
    await page.goto('/?screen=practice')
    const banner = page.locator('#sec-verbs')
    await expect(banner).toBeVisible({ timeout: 15000 })
    await expect(banner).toContainText('Неправильные глаголы')
    await page.locator('.pp-chip', { hasText: 'Глаголы' }).click()
    await expect(page.locator('#sec-reading')).toHaveCount(0)
    await banner.locator('.pp-listen__cta').click()
    await expect(page.locator('.vb-head h1')).toHaveText('Неправильные глаголы')
  })
})
