import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { playSteps, exactly } from './helpers/course-steps.js'

// Задания «Listen. Choose the picture.» уровня A0.
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
const STEPS_FILE = path.join(process.cwd(), 'public/course/a0/steps-1.json')
// Узел тропы — урок целиком: стадии (словарь, слушание и остальные) идут одной
// очередью экранов, поэтому ожидаемые шаги считаются по всему уроку.
function vocabSteps() {
  return JSON.parse(fs.readFileSync(STEPS_FILE, 'utf8')).steps
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
    await playSteps(page, steps, target)

    // Экран слова на слух: слушать есть чем — обе кнопки на месте, обычная
    // скорость и медленная. Запись это или синтез, зависит от того, нашлась ли
    // для слова озвучка, — экрану всё равно, лишь бы не был немым.
    await expect(page.locator('.cp-step .cp-audio')).toBeVisible()
    await expect(page.locator('.cp-step .cp-audio__play')).toBeVisible()
    await expect(page.locator('.cp-step .cp-audio__slow')).toBeVisible()

    // Задание проверяемое: до выбора «Проверить» заблокирована, после — нет.
    await expect(page.locator('.cp-cta')).toBeDisabled()
    await page.locator('.cp-choice', { hasText: exactly(steps[target].answer) }).first().click()
    await page.locator('.cp-cta:not([disabled])').click()
    await expect(page.locator('.cp-fb.is-ok')).toBeVisible()
  })
})
