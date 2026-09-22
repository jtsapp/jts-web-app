import { test, expect } from '@playwright/test'
import { sayAudioUrl } from '../scripts/jts-self/say-audio.js'

// Шаг «послушайте, затем запишите себя» в настоящем плеере на настоящих
// данных. Образцы были строками и звучали браузерным синтезом (на Android без
// английского голоса — тишина); теперь запись образца лежит рядом, в itemAudio
// (scripts/voice-step-cards.js), и тап играет файл. Задание по-русски — у B1
// таких больше половины строк — показано текстом, а не кнопкой «послушать».
//
// До record-шага урок идёт десятки экранов (у A0 урока 1 — 56-й из 58), поэтому
// ответ steps-1.json подменяется: берётся настоящий файл, и в нём остаются
// только шаги record. Плеер, данные и записи при этом настоящие.
async function openRecordSteps(page, level) {
  await page.route(new RegExp(`/course/${level.toLowerCase()}/steps-1\\.json(\\?|$)`), async (route) => {
    const res = await route.fetch()
    const data = await res.json()
    await route.fulfill({ response: res, json: { ...data, steps: data.steps.filter((s) => s.type === 'record') } })
  })
  // Считаем и синтез, и проигрывание: «файл отдался» ещё не значит «файл
  // заиграл» — битая запись тоже приходит 200 audio/mpeg, и плеер откатывается
  // на синтез уже после, когда play() отклонён.
  await page.addInitScript(() => {
    window.__spoken = []
    window.__played = []
    if (window.speechSynthesis) window.speechSynthesis.speak = (u) => window.__spoken.push(u.text)
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      const rec = { src: this.src, state: 'pending' }
      window.__played.push(rec)
      const p = play.call(this)
      p.then(
        () => (rec.state = 'playing'),
        (e) => (rec.state = `error ${e?.name || e}`),
      )
      return p
    }
  })
  await page.goto(`/?screen=kingdom-interior&level=${level}&unlock=1`)
  await page.locator('.kt-step:not([disabled])').first().click()
  await expect(page.locator('.cp-rec')).toBeVisible({ timeout: 20000 })
}

// Тап по образцу → заиграла ИМЕННО его запись (имя файла — хэш текста), и ни
// слова синтеза.
async function tapPlaysRecording(page, level, text) {
  await page.locator('.cp-rec button.cp-rec__line', { hasText: text }).click()
  await expect
    .poll(() => page.evaluate(() => window.__played.map((p) => `${new URL(p.src).pathname} ${p.state}`)))
    .toEqual([`${sayAudioUrl(level, text)} playing`])
  expect(await page.evaluate(() => window.__spoken)).toEqual([])
}

test('A0: образец звучит своей записью, а не синтезом', async ({ page }) => {
  await openRecordSteps(page, 'A0')
  await expect(page.locator('.cp-rec button.cp-rec__line')).toHaveCount(4)
  await tapPlaysRecording(page, 'a0', 'I like coffee.')
})

test('B1: задание по-русски — текст, рамка ответа звучит записью', async ({ page }) => {
  await openRecordSteps(page, 'B1')
  // Первые два record урока — задания по-русски: ни одной кнопки «послушать».
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('.cp-rec p.cp-rec__line--task')).toHaveCount(3)
    await expect(page.locator('.cp-rec button.cp-rec__line')).toHaveCount(0)
    await page.locator('.cp-cta:not([disabled])').click()
  }
  // Третий — рамки ответа по-английски, и у каждой своя запись.
  await expect(page.locator('.cp-rec button.cp-rec__line')).toHaveCount(3)
  await tapPlaysRecording(page, 'b1', "My closest friend is … . We've known each other for/since … .")
})
