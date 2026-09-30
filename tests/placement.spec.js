import { test, expect } from '@playwright/test'
import path from 'node:path'
import { routeFakeBank, correctOptionTexts } from './helpers/placement-bank.js'

// Тест на определение уровня — нативный экран приложения (PlacementTestPage)
// поверх перенесённого движка школы. Совпадение расчётов с бандлом проверяет
// placementParity.test.js; здесь — что экран собирается из данных банка и
// доводит студента от выбора варианта до заданий.

// Ключ ответов живёт на сервере, а не в публичном bank.json (bankSplit.js):
// «правильно ответить» тест может, только прочитав его с диска.
const keysPath = () =>
  path.join(test.info().project.testDir, '..', 'src', 'practice', 'placement', 'keys.generated.json')

const open = async (page) => {
  await page.goto('/?screen=test')
  await expect(page.locator('.plc-card')).toBeVisible({ timeout: 20000 })
}

test.describe('placement — экран теста', () => {
  test('банк доезжает вместе с озвучкой и клипами', async ({ page }) => {
    const status = async (url) => (await page.request.get(url)).status()

    expect(await status('/practice/placement/bank.json')).toBe(200)
    expect(await status('/practice/placement/jts-bank/soundcheck.mp3')).toBe(200)
    expect(await status('/practice/placement/jts-bank/a0/w01.mp3')).toBe(200)
    expect(await status('/practice/placement/jts-bank/clips/clip1.mp4')).toBe(200)

    const bank = await (await page.request.get('/practice/placement/bank.json')).json()
    expect(bank.bank.items.length).toBeGreaterThan(160)
    expect(Object.keys(bank.vocab).length).toBeGreaterThan(50)
  })

  test('выбор варианта, самооценка и первый раздел', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await open(page)

    await expect(page.locator('.plc-h1')).toHaveText('Выберите вариант теста')
    await expect(page.locator('.plc-opt')).toHaveCount(2)
    await page.locator('.plc-opt').first().click()

    // Самооценка задаёт стартовую θ — пять ступеней, как в бандле.
    await expect(page.locator('.plc-h1')).toHaveText('Оцените свой английский')
    await expect(page.locator('.plc-opt')).toHaveCount(5)
    await page.locator('.plc-opt').nth(2).click()

    // Перед разделом — экран с объяснением, а не сразу задание.
    await expect(page.locator('.plc-h1')).toHaveText('Разминка')
    await expect(page.locator('.plc-card')).toContainText('Шесть быстрых вопросов')
    await page.locator('.plc-primary').click()

    await expect(page.locator('.plc-stem')).toBeVisible()
    await expect(page.locator('.plc-opt')).toHaveCount(4)
    await expect(page.locator('.plc-count')).toHaveText('1 / 6')
    expect(errors).toEqual([])
  })

  // «Далее» под запретом, пока ответа нет: пустой ответ уходит в движок как
  // неверный и портит оценку — пусть студент отвечает осознанно.
  test('без ответа дальше не пускает, с ответом — пускает', async ({ page }) => {
    await open(page)
    await page.locator('.plc-opt').first().click()
    await page.locator('.plc-opt').nth(2).click()
    await page.locator('.plc-primary').click()

    await expect(page.locator('.plc-primary')).toBeDisabled()
    await page.locator('.plc-opt').first().click()
    await expect(page.locator('.plc-primary')).toBeEnabled()

    await page.locator('.plc-primary').click()
    await expect(page.locator('.plc-count')).toHaveText('2 / 6')
    // Назад — ответы раздела можно менять до его завершения.
    // Рядом с «Назад» теперь и «Не знаю» того же класса — берём по тексту.
    await page.locator('.plc-ghost', { hasText: 'Назад' }).click()
    await expect(page.locator('.plc-count')).toHaveText('1 / 6')
    await expect(page.locator('.plc-opt.on')).toHaveCount(1)
  })

  test('раздел завершается и ведёт к следующему', async ({ page }) => {
    // Отвечаем правильно (тексты верных ответов — по серверному ключу): случайные
    // клики честно проваливают разминку и уводят на A0-мост, а этот тест —
    // про обычный переход между разделами.
    const correct = await correctOptionTexts(page, keysPath())
    await open(page)
    await page.locator('.plc-opt').first().click()
    await page.locator('.plc-opt').nth(2).click()
    await page.locator('.plc-primary').click()

    for (let i = 0; i < 6; i++) {
      for (const b of await page.locator('.plc-opt').all()) {
        if (correct.has((await b.innerText()).trim())) { await b.click(); break }
      }
      await page.locator('.plc-primary:not([disabled])').click()
      await page.waitForTimeout(150)
    }
    await expect(page.locator('.plc-h1')).toHaveText('Различение слов')
    await expect(page.locator('.plc-card')).toContainText('2 / 7')
  })
})

// ─── A0-мост и контракт экрана с движком ────────────────────────────────────
// Банк подменяется крошечным детерминированным (tests/helpers/placement-bank.js):
// так сценарий «новичок ушёл на мост» воспроизводится точно, а не вероятностно.
const openFake = async (page) => {
  await routeFakeBank(page)
  await page.goto('/?screen=test')
  await expect(page.locator('.plc-card')).toBeVisible({ timeout: 20000 })
  await page.locator('.plc-opt').first().click() // экспресс
  await page.locator('.plc-opt').nth(2).click() // самооценка
  await page.locator('.plc-primary').click() // старт разминки
}

const failRouting = async (page) => {
  // Длину разминки задаёт движок (buildRouting), а не фикстура — щёлкаем,
  // пока на экране есть варианты, и выходим, когда раздел кончился.
  for (let i = 0; i < 8; i++) {
    const wrong = page.locator('.plc-opt', { hasText: 'WRONG-1' })
    if (!(await wrong.count())) break
    await wrong.click()
    await page.locator('.plc-primary:not([disabled])').click()
    await page.waitForTimeout(120)
  }
}

test.describe('placement — A0-мост', () => {
  test('провал разминки уводит на мост, провал моста даёт A0', async ({ page }) => {
    await openFake(page)
    await failRouting(page)

    // Мост подписан своим заголовком из строк бандла.
    await expect(page.locator('.plc-h1')).toHaveText('Стартовый блок')
    await page.locator('.plc-primary').click()
    for (let i = 0; i < 2; i++) {
      await page.locator('.plc-input').fill('zz')
      await page.locator('.plc-primary:not([disabled])').click()
    }
    // Ранний выход: сразу результат, без остальных разделов.
    await expect(page.locator('.plc-level')).toHaveText('A0')
  })

  test('пройденный мост возвращает в тест со следующего раздела', async ({ page }) => {
    await openFake(page)
    await failRouting(page)
    await expect(page.locator('.plc-h1')).toHaveText('Стартовый блок')
    await page.locator('.plc-primary').click()
    for (let i = 0; i < 2; i++) {
      await page.locator('.plc-input').fill('ok')
      await page.locator('.plc-primary:not([disabled])').click()
    }
    // Возврат в план: интро следующего раздела, НЕ «Стартовый блок» и не A0.
    await expect(page.locator('.plc-h1')).not.toHaveText('Стартовый блок')
    await expect(page.locator('.plc-level')).toHaveCount(0)
    // «Начать» проваливается сквозь пустые в фикстуре разделы прямо к вопросу
    // чтения — пропуск не показывает их интро и не открывает раздел дважды.
    await page.locator('.plc-primary').click()
    await expect(page.locator('.plc-step').first()).toHaveText('Чтение')
    await expect(page.locator('.plc-rtext')).toContainText('Anna has a small cat.')
    await page.locator('.plc-opt', { hasText: 'Anna' }).click()
    await page.locator('.plc-primary:not([disabled])').click()
    // Грамматика → письмо → результат: ни один раздел не открылся дважды.
    await expect(page.locator('.plc-h1')).toHaveText('Грамматика')
    await page.locator('.plc-primary').click()
    await page.locator('.plc-input').fill('is')
    await page.locator('.plc-primary:not([disabled])').click()
    await expect(page.locator('.plc-h1')).toHaveText('Письмо')
    await page.locator('.plc-primary').click()
    await page.locator('.plc-textarea').fill('My day was fine and I studied English with pleasure.')
    await page.locator('.plc-primary:not([disabled])').click()
    await expect(page.locator('.plc-level')).toBeVisible()
  })
})

// ─── словарь: формат движка — выбор значения, а не тумблер «знаю» ──────────
// Тексты правильных ответов всех mcq-заданий реального банка (correctOptionTexts):
// щёлкая их, проход не проваливает разминку и не уезжает на A0-мост.
test.describe('placement — словарь', () => {
  test('вопрос словаря даёт варианты значений и «Не знаю»', async ({ page }) => {
    test.setTimeout(180000)
    const correct = await correctOptionTexts(page, keysPath())
    await page.goto('/?screen=test')
    await expect(page.locator('.plc-card')).toBeVisible({ timeout: 20000 })
    await page.locator('.plc-opt').first().click()
    await page.locator('.plc-opt').nth(2).click()

    // Идём по разделам, отвечая правильно где знаем ответ, пока не словарь.
    for (let step = 0; step < 90; step++) {
      // Экран словаря узнаём по крупному спрашиваемому слову — заголовки
      // разделов совпадают на интро и на вопросах, по ним стопориться ненадёжно.
      if (await page.locator('.plc-stem--word').count()) break
      for (const row of await page.locator('.plc-tf').all()) await row.locator('.plc-tf__btn').first().click()
      for (let g = 0; g < 14; g++) {
        const tile = page.locator('.plc-bank .plc-tile:not([disabled])').first()
        if (!(await tile.count())) break
        await tile.click()
      }
      for (const list of await page.locator('.plc-list').all()) {
        const btns = await list.locator('.plc-opt').all()
        if (!btns.length) continue
        let clicked = false
        for (const b of btns) {
          const txt = (await b.innerText()).trim()
          if (correct.has(txt)) { await b.click().catch(() => {}); clicked = true; break }
        }
        if (!clicked) await btns[0].click().catch(() => {})
      }
      for (const inp of await page.locator('.plc-input').all()) await inp.fill('the')
      let go = page.locator('.plc-primary:not([disabled])')
      if (!(await go.count())) {
        // «Порядок событий» в аудировании требует выбрать все пункты — добираем
        // оставшиеся не-выбранные варианты и пробуем ещё раз.
        for (const b of await page.locator('.plc-opt:not(.on)').all()) await b.click().catch(() => {})
        go = page.locator('.plc-primary:not([disabled])')
      }
      if (await go.count()) await go.click()
      await page.waitForTimeout(120)
    }

    // Спрашиваемое слово крупно, 4 значения + «Не знаю» — контракт vocabScore.
    await expect(page.locator('.plc-stem--word')).toBeVisible()
    await expect(page.locator('.plc-step').first()).toHaveText('Словарь')
    await expect(page.locator('.plc-opt')).toHaveCount(5)
    const idk = page.locator('.plc-opt--idk')
    await expect(idk).toHaveText('Не знаю')
    await idk.click()
    await expect(idk).toHaveClass(/on/)
    await expect(page.locator('.plc-primary:not([disabled]), .plc-primary:enabled').first()).toBeEnabled()
  })
})
