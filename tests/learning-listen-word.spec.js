import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { nativeLessonSteps } from '../src/learning/nativeSteps.js'

// Задания «Listen. Choose the word you hear.» уровня A0 (250 экранов).
//
// Слово в них не написано нигде: исходный курс произносил его синтезом речи по
// своей кнопке (`sayWord('repeat')`), кнопка — мёртвый контрол и из разметки
// уходит, поэтому слово едет в задании полем `say`. Пока плеер это поле
// игнорировал, на экране оставались одни варианты — студент угадывал один к
// четырём и терял сердце за промах. Тест держит именно эту границу: у шага со
// словом на слух ЕСТЬ чем его послушать.
//
// До нужного экрана идём, отвечая ВЕРНО (ответы берём из тех же данных, что
// играет плеер): наугад урок не доживает — три промаха, и вместо задания будет
// экран итогов.
const LEVEL_FILE = path.join(process.cwd(), 'public/learning/a0.json')
// Узел тропы — урок курса целиком: стадии (словарь, слушание и остальные)
// склеены в одну очередь экранов, поэтому и словарь, и дорожка живут в одном
// узле, а ожидаемые шаги считаются по всему уроку.
const LESSON_TITLE = 'Coffee — yes. Mondays — no.'

function vocabSteps() {
  const level = JSON.parse(fs.readFileSync(LEVEL_FILE, 'utf8'))
  return nativeLessonSteps(level, LESSON_TITLE)
}

async function bootLearning(page) {
  await page.route('**/api/auth/me', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: { userId: 1, name: 'Test', phone: '77010001122', role: 'USER', languageLevel: 'A1' } }) }),
  )
  await page.route('**/mobile/lesson-modules', (r) => r.fulfill({ contentType: 'application/json', body: '[]' }))
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
  // Словарь A0 — второй узел тропы; ?unlock=1 (dev-флаг тропы) снимает
  // последовательность, чтобы не проходить разминку ради соседнего узла.
  await page.goto('/?screen=kingdom&unlock=1')
}

/** Разблокирует «Проверить/Продолжить» на экране без известного ответа. */
async function unlockStep(page) {
  if (!(await page.locator('.cp-cta[disabled]').count())) return
  const tries = ['.cp-pick', '.cp-check__row', '.cp-choice', '.cp-rows__opt', '.cp-chip', '.cp-match__item']
  for (const sel of tries) {
    const el = page.locator(sel).first()
    if (await el.count()) {
      await el.click({ timeout: 2000 }).catch(() => {})
      if (!(await page.locator('.cp-cta[disabled]').count())) return
    }
  }
  const input = page.locator('.cp-gap__in, .cp-write, .cp-group__in').first()
  if (await input.count()) await input.fill('test').catch(() => {})
}

test.describe('A0: слово на слух', () => {
  test('у задания со словом на слух есть кнопка озвучки, и ответ засчитывается', async ({ page }) => {
    test.setTimeout(120000)

    const steps = vocabSteps()
    const target = steps.findIndex((s) => s.say)
    expect(target, 'в узле словаря A0 нет ни одного шага со словом на слух').toBeGreaterThan(-1)

    await bootLearning(page)
    await page.locator('.lp-node', { hasText: 'Уровень A0' }).first().click()
    const vocab = page.locator('.kt-step:not([disabled])').first()
    await expect(vocab).toBeVisible({ timeout: 15000 })
    await vocab.click()
    await expect(page.locator('.cp-step')).toBeVisible({ timeout: 15000 })

    // Доходим до нужного экрана, отвечая верно.
    for (let i = 0; i < target; i++) {
      await answerStep(page, steps[i])
      await page.locator('.cp-cta:not([disabled])').click() // «Продолжить»
    }

    // Экран слова на слух: плеер стоит, но дорожки у него нет — звук даёт
    // синтез речи. Обе кнопки на месте: обычная скорость и медленная.
    await expect(page.locator('.cp-step .cp-audio')).toBeVisible()
    await expect(page.locator('.cp-step .cp-audio audio')).toHaveCount(0)
    await expect(page.locator('.cp-step .cp-audio__play')).toBeVisible()
    await expect(page.locator('.cp-step .cp-audio__slow')).toBeVisible()

    // Задание проверяемое: до выбора «Проверить» заблокирована, после — нет.
    await expect(page.locator('.cp-cta')).toBeDisabled()
    await page.locator('.cp-choice', { hasText: new RegExp(`^\\s*${escapeRe(steps[target].answer)}\\s*$`) }).first().click()
    await page.locator('.cp-cta:not([disabled])').click()
    await expect(page.locator('.cp-fb.is-ok')).toBeVisible()
  })

  // Стадия Listening: экстрактор вынимает кнопку плеера из строки урока
  // отдельным блоком, поэтому такой шаг — только дорожка, отвечать нечем.
  // Пока он считался проверяемым, «Проверить» на нём не включалась никогда:
  // 24 экрана A0 намертво запирали стадию.
  test('экран слушания без вариантов пропускает дальше, а не запирает урок', async ({ page }) => {
    test.setTimeout(120000)

    const steps = vocabSteps()
    const bare = steps.findIndex((s) => s.type === 'listen' && !(s.options || []).length)
    // Регрессия сторожит реальный случай: шаг-дорожка без вариантов не должен
    // запирать урок. Но в текущих данных A0 шагов `listen` нет вовсе — проверено
    // прогоном nativeLessonSteps по всем 151 уроку уровня: ни одного. Значит
    // воспроизвести нечем, и честнее пропустить с причиной, чем падать по
    // таймауту в браузере. Условие по данным, а не жёсткий skip: вернётся такой
    // шаг в A0 — тест оживёт сам.
    test.skip(bare === -1, 'в данных A0 нет шага listen без вариантов — воспроизводить нечем')

    await bootLearning(page)
    await page.locator('.lp-node', { hasText: 'Уровень A0' }).first().click()
    // Стадия Listening лежит внутри того же узла-урока.
    const listening = page.locator('.kt-step:not([disabled])').first()
    await expect(listening).toBeVisible({ timeout: 15000 })
    await listening.click()
    await expect(page.locator('.cp-step')).toBeVisible({ timeout: 15000 })

    // Доходим до экрана-дорожки, отвечая верно: он лежит в стадии слушания,
    // то есть ближе к концу урока.
    for (let i = 0; i < bare; i++) {
      await answerStep(page, steps[i])
      await page.locator('.cp-cta:not([disabled])').click()
    }

    // Дорожка есть, вариантов нет — и кнопка внизу активна («Продолжить»).
    await expect(page.locator('.cp-step .cp-audio audio')).toHaveCount(1)
    await expect(page.locator('.cp-choice')).toHaveCount(0)
    await expect(page.locator('.cp-cta')).toBeEnabled()

    // Шаг не оценивается: за «неответ» ничего не списывается, урок идёт дальше.
    await page.locator('.cp-cta').click()
    await expect(page.locator('.cp-step')).toBeVisible()
    const advanced = await page.locator('.cp-hud__fill').evaluate((el) => parseFloat(el.style.width) > 0)
    expect(advanced, 'после экрана-дорожки урок не продвинулся').toBeTruthy()
  })
})

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const exactly = (s) => new RegExp(`^\\s*${escapeRe(s)}\\s*$`)

/** Отвечает на экран верно и жмёт «Проверить». Неоценочные шаги пропускает. */
export async function answerStep(page, step) {
  if (step.type === 'match') {
    // Соединение: тап по пункту слева, затем по его варианту в банке.
    for (const [i, pair] of step.pairs.entries()) {
      await page.locator('.cp-match__item').nth(i).click()
      await page.locator('.cp-match__bank .cp-chip', { hasText: exactly(pair.right) }).first().click()
    }
  } else if (step.type === 'group') {
    for (const [i, item] of step.items.entries()) {
      await page.locator('.cp-group__in').nth(i).fill(item.answers[0])
    }
  } else if (step.answer) {
    await page.locator('.cp-choice', { hasText: exactly(step.answer) }).first().click()
  } else {
    // Экран без правильного ответа: кнопка внизу может ждать отметки.
    await unlockStep(page)
    return
  }
  await page.locator('.cp-cta:not([disabled])').click() // «Проверить»
  await expect(page.locator('.cp-fb.is-ok')).toBeVisible()
}
