import { test, expect } from '@playwright/test'

// Словарь после перевода с iframe-прототипа на нативный экран.
// Прогон беззвучный: TTS и WebAudio заглушены, звук в настройках выключен —
// иначе локальный запуск тестов орёт на всю комнату.

const silence = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('jts_vocab2', JSON.stringify({ sound: false }))
    try {
      window.speechSynthesis.speak = () => {}
      window.speechSynthesis.cancel = () => {}
      window.speechSynthesis.getVoices = () => []
    } catch (e) {
      /* нет Web Speech API — и не надо */
    }
    const Silent = function () {
      return {
        state: 'running', currentTime: 0, destination: {}, resume() {},
        createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: {}, type: '' }),
        createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }),
      }
    }
    window.AudioContext = Silent
    window.webkitAudioContext = Silent
  })
}

const openVocab = async (page) => {
  await silence(page)
  await page.goto('/?screen=vocab')
  await expect(page.locator('.v-setup-title')).toBeVisible()
}

test.describe('Словарь — нативный экран', () => {
  test('никакого iframe: экран собран в React', async ({ page }) => {
    await openVocab(page)
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect(page.locator('.vc')).toBeVisible()
  })

  test('настройка: уровни, режимы, акцент и время из данных прототипа', async ({ page }) => {
    await openVocab(page)
    await expect(page.locator('.v-lvl-cell')).toHaveCount(5)
    await expect(page.locator('.v-lvl-cell').first()).toContainText('A1')
    await expect(page.locator('.v-time-cell')).toHaveCount(3)
    // Кнопка показывает размер выборки уровня — A1 Essentials = 900 слов.
    await expect(page.locator('.v-ob-foot .v-btn')).toContainText('900')

    await page.locator('.v-lvl-cell', { hasText: 'B1' }).click()
    await expect(page.locator('.v-lvl-cell.v-sel')).toContainText('B1')
    await expect(page.locator('.v-ob-foot .v-btn')).toContainText('1500')
  })

  test('обзор: счётчики, полный список и живой поиск', async ({ page }) => {
    await openVocab(page)
    await page.locator('.v-ob-foot .v-btn').click()

    await expect(page.locator('.v-ovw-stat.v-lvl .v-v')).toHaveText('900')
    await expect(page.locator('.v-ovw-stat.v-lvl .v-s')).toContainText('A1')
    await expect.poll(() => page.locator('.v-ovw-row').count()).toBe(900)

    await page.locator('.v-ovw-search input').fill('water')
    await expect.poll(() => page.locator('.v-ovw-row').count()).toBeLessThan(900)
    await expect(page.locator('.v-ovw-row').first()).toContainText('water')
  })

  test('сбор карточек: переворот открывает значение и пример', async ({ page }) => {
    await openVocab(page)
    await page.locator('.v-time-cell:has(b:text-is("5"))').click() // короткая сессия
    await page.locator('.v-ob-foot .v-btn').click()
    await expect(page.locator('.v-ovw-row').first()).toBeVisible()
    await page.locator('.v-ob-foot .v-btn').click()

    await expect(page.locator('.v-ff-word')).toBeVisible()
    await expect(page.locator('.v-sess-timer')).toHaveText('1 / 6')
    await page.locator('.v-flip').click()
    await expect(page.locator('.v-flip')).toHaveClass(/v-flipped/)
    await expect(page.locator('.v-fb-def2')).not.toBeEmpty()
    await expect(page.locator('.v-fb-ex2')).toBeVisible()
  })

  test('сессия: задания идут потоком, прогресс SRS сохраняется', async ({ page }) => {
    test.slow() // полная сессия из 6 слов — десятки заданий
    await openVocab(page)
    await page.locator('.v-time-cell:has(b:text-is("5"))').click()
    await page.locator('.v-ob-foot .v-btn').click()
    await expect(page.locator('.v-ovw-row').first()).toBeVisible()
    await page.locator('.v-ob-foot .v-btn').click()
    await expect(page.locator('.v-ff-word')).toBeVisible()

    // Все слова помечаем «не знаю» — этап 2 берёт именно их.
    for (let i = 0; i < 6; i++) {
      await page.locator('.v-btn.v-dont').click()
      await page.waitForTimeout(120)
    }
    await expect(page.locator('.v-stage .v-q-ask')).toBeVisible()
    await expect(page.locator('.v-round-name')).toContainText('0/6')

    // Проходим сессию до итогов, решая парные задания по data-id.
    const types = new Set()
    for (let i = 0; i < 160; i++) {
      if (await page.locator('.v-res-h').count()) break
      const kind = await page.evaluate(() => {
        const q = (s) => document.querySelector(s)
        if (q('.v-mem-grid')) return 'memory'
        if (q('.v-match-wrap')) return 'match'
        if (q('.v-drag-imgs')) return 'dragmatch'
        if (q('.v-ch-timer')) return 'challenge'
        if (q('.v-swipe-card')) return 'swipe'
        if (q('.v-tiles')) return 'construct'
        if (q('.v-pbank')) return 'scramble'
        if (q('.v-trace-grid')) return 'trace'
        if (q('.v-pron-card')) return 'pronounce'
        if (q('.v-imggrid')) return 'imagepick'
        if (q('.v-choice')) return 'pick'
        return null
      })
      if (kind) types.add(kind)
      await page.evaluate(() => {
        const q = (s) => document.querySelector(s)
        const qa = (s) => [...document.querySelectorAll(s)]
        if (q('.v-match-wrap')) {
          const l = qa('.v-mcol:first-child .v-mcard:not(.v-ok)')[0]
          if (l) { l.click(); const r = q(`.v-mcol:last-child .v-mcard[data-id="${l.dataset.id}"]`); if (r) r.click() }
          return
        }
        if (q('.v-mem-grid')) {
          const closed = qa('.v-mem:not(.v-done)').filter((m) => !m.classList.contains('v-flip'))
          const a = closed[0]
          if (a) { a.click(); const b = closed.find((m) => m !== a && m.dataset.id === a.dataset.id); if (b) b.click() }
          return
        }
        if (q('.v-drag-imgs')) {
          const c = q('.v-wchip:not(.v-used)')
          if (c) { c.click(); const t = q(`.v-dropimg[data-id="${c.dataset.id}"]`); if (t) t.click() }
          return
        }
        if (q('.v-trace-grid')) { const t = q('.v-tnode.v-next'); if (t) t.click(); return }
        if (q('.v-tiles')) { const t = q('.v-tile:not(.v-used)'); if (t) { t.click(); return } }
        if (q('.v-pbank')) { const t = q('.v-ptile:not(.v-used)'); if (t) { t.click(); return } }
        const check = q('.v-sess-foot .v-btn:not([disabled]), .v-know-row .v-btn:not([disabled])')
        if (check) { check.click(); return }
        if (q('.v-pron-card')) { const s = qa('.v-pron-actions .v-chip').pop(); if (s) { s.click(); return } }
        if (q('.v-swipe-card')) { const y = q('.v-bucket.v-yes'); if (y) { y.click(); return } }
        const opt = q('.v-choice:not([disabled]), .v-imgtile:not([disabled])')
        if (opt) opt.click()
      })
      await page.waitForTimeout(450)
      if (await page.locator('.v-feedback .v-btn').count()) {
        await page.locator('.v-feedback .v-btn').click()
        await page.waitForTimeout(350)
      }
    }

    // Дошли до итогов, и в них — те же 6 слов, что были в сессии.
    await expect(page.locator('.v-res-h')).toBeVisible()
    await expect(page.locator('.v-res-stat').first().locator('.v-v')).toHaveText('6')
    expect(types.size).toBeGreaterThan(2)

    // Прогресс лёг в localStorage под ключом прототипа — старые пользователи
    // не теряют накопленное при переезде с iframe.
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('jts_vocab2') || '{}'))
    expect(Object.keys(saved.srs || {}).length).toBe(6)
    expect(saved.seenCount).toBe(6)
  })

  test('раскладка не разъезжается по ширине', async ({ page }) => {
    await openVocab(page)
    const fits = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    expect(await fits()).toBe(true)
    await page.locator('.v-ob-foot .v-btn').click()
    await expect(page.locator('.v-ovw-row').first()).toBeVisible()
    expect(await fits()).toBe(true)
  })
})
