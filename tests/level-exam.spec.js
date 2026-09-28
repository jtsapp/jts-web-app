import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Финальный экзамен уровня: узел в конце тропы → 50 ответов → итоги → разбор.
// Диплинк с ?unlock=1 (только dev): иначе экзамен ждёт пройденного курса в
// каталоге, а здесь проверяется сам экран.
//
// Ответы берём из той же выгрузки, что читает экран, и кликаем по ИСХОДНОМУ
// индексу варианта (data-opt): на экране варианты перемешаны.

// MPEG-1 Layer III, 44.1 кГц, 128 кбит/с, моно: кадр 417 байт — заголовок и
// нули, декодер читает их как тишину (как в listenchoose.spec.js).
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}
const SILENCE = silentMp3()

// Спеки Playwright грузит как CommonJS — import.meta здесь нет, __dirname есть.
const exam = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/exam/a1/exam.json'), 'utf8'))
const questions = exam.sections.flatMap((s) => [
  ...(s.dialogue ? s.dialogue.gaps : []),
  ...(s.questions || []),
  ...(s.passages || []).flatMap((p) => p.questions),
])

test.beforeEach(async ({ page }) => {
  await page.route('**/exam/a1/audio/*.mp3', (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: SILENCE }))
})

async function openExam(page) {
  await page.goto('/?screen=kingdom-interior&level=A1&unlock=1')
  const node = page.locator('.kt-unit').last().locator('.kt-step')
  await expect(page.locator('.kt-unit').last().locator('.kt-unit__title')).toHaveText('Финальный экзамен', { timeout: 30000 })
  await expect(node).toBeEnabled()
  await node.click()
  await expect(page.locator('.ex-q').first()).toBeVisible({ timeout: 20000 })
}

async function answerAll(page, pick) {
  for (const q of questions) {
    const idx = pick(q)
    const select = page.locator(`select[data-qid="${q.id}"]`)
    if (await select.count()) await select.selectOption(String(idx))
    else await page.locator(`[data-qid="${q.id}"] [data-opt="${idx}"]`).click()
  }
}

test('A1: все ответы верные — экзамен сдан, в разборе видна стенограмма', async ({ page }) => {
  expect(questions).toHaveLength(50)
  await openExam(page)
  await expect(page.locator('.ex-finish')).toBeDisabled()
  await answerAll(page, (q) => q.answer)
  await expect(page.locator('.ex-hud__count')).toHaveText('Отвечено 50 из 50')
  await page.locator('.ex-finish').click()

  await expect(page.locator('.ex-res__title')).toHaveText('Экзамен сдан!')
  await expect(page.locator('.ex-res__score b')).toHaveText('50')
  await expect(page.locator('.ex-tips.is-good')).toBeVisible()

  await page.getByRole('button', { name: 'Посмотреть ответы' }).click()
  await expect(page.locator('.ex-transcript')).toHaveCount(4)
  await expect(page.locator('.ex-opt.is-wrong')).toHaveCount(0)
  await expect(page.locator('.ex-q.is-right')).toHaveCount(38) // 50 минус 12 пропусков диалогов
})

test('A1: все ответы мимо — не сдан, совет по каждому навыку', async ({ page }) => {
  await openExam(page)
  await answerAll(page, (q) => (q.answer + 1) % q.options.length)
  await page.locator('.ex-finish').click()
  await expect(page.locator('.ex-res__title')).toHaveText('Пока не хватает баллов')
  await expect(page.locator('.ex-res__score b')).toHaveText('0')
  await expect(page.locator('.ex-tips li')).toHaveCount(4)

  await page.getByRole('button', { name: 'Пройти снова' }).click()
  await expect(page.locator('.ex-finish')).toHaveText('Осталось ответить: 50')
})

test('A1: запись аудирования играет с файла и доигрывает', async ({ page }) => {
  await openExam(page)
  const play = page.locator('.ex-audio .ex-player__btn').first()
  await play.scrollIntoViewIfNeeded()
  await play.click()
  // Тишина на полсекунды: плеер обязан доиграть её и вернуть «Слушать», без
  // «Запись не загрузилась».
  await expect(play).toHaveText('Слушать', { timeout: 10000 })
  await expect(page.locator('.ex-player__err')).toHaveCount(0)
})

test('A1: ответы переживают перезагрузку страницы', async ({ page }) => {
  await openExam(page)
  const first = questions.find((q) => !q.id.startsWith('gd') && !q.id.startsWith('vd'))
  await page.locator(`[data-qid="${first.id}"] [data-opt="${first.answer}"]`).click()
  // Заново по диплинку: после входа приложение снимает ?screen= с адреса, и
  // голый reload привёл бы на главную.
  await page.goto('/?screen=kingdom-interior&level=A1&unlock=1')
  const node = page.locator('.kt-unit').last().locator('.kt-step')
  await expect(node).toBeEnabled({ timeout: 30000 })
  await node.click()
  await expect(page.locator('.ex-intro__restored')).toBeVisible()
  await expect(page.locator(`[data-qid="${first.id}"] [data-opt="${first.answer}"]`)).toHaveClass(/is-sel/)
})
