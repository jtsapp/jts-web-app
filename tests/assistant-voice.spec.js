import { test, expect } from '@playwright/test'

// Голосовой вопрос в окне помощника целиком в браузере: фальшивый микрофон
// Chrome → настоящая запись (MediaRecorder → WAV 16 кГц) → распознавание →
// чат с voice: true → озвучка фразы и её проигрывание. Распознавание, модель и
// синтез подменены — проверяется цепочка экрана, а не Soniox, Claude и Gemini.
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] },
})

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// 0.3 с тишины WAV 8 кГц — валидная запись для <audio>.
function silentWav() {
  const n = 2400
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + n * 2, 4)
  b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(8000, 24)
  b.writeUInt32LE(16000, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write('data', 36)
  b.writeUInt32LE(n * 2, 40)
  return b
}

async function setup(page, { sttText = 'Үй жұмысы қайда?', reply = 'Үй жұмысы — сол жақ мәзірдегі «Үй жұмысы» бөлімінде. ', speakStatus = 200 } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    // Что реально заиграло: адрес и состояние play().
    window.__played = []
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
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  const calls = { stt: [], chat: [], speak: [], tts: [] }
  await page.route('**/api/assistant/transcribe', async (r) => {
    const req = r.request()
    calls.stt.push({ auth: req.headers().authorization, size: req.postDataBuffer()?.length || 0, body: req.postDataBuffer()?.toString('latin1') || '' })
    await r.fulfill(json({ text: sttText }))
  })
  await page.route('**/api/assistant/chat', async (r) => {
    calls.chat.push(JSON.parse(r.request().postData()))
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: reply })
  })
  await page.route('**/api/assistant/speak', async (r) => {
    calls.speak.push(JSON.parse(r.request().postData()))
    if (speakStatus !== 200) return r.fulfill(json({ error: 'tts_failed' }, speakStatus))
    await r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() })
  })
  // Потоковый Soniox — казахский ответ и запасной голос.
  await page.route('**/api/tts?**', async (r) => {
    calls.tts.push(Object.fromEntries(new URL(r.request().url()).searchParams))
    await r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() })
  })
  return calls
}

async function askByVoice(page) {
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  await expect(page.getByRole('dialog', { name: 'Луна' })).toBeVisible()
  await page.getByRole('button', { name: 'Спросить голосом' }).click()
  const stop = page.getByRole('button', { name: 'Закончить вопрос' })
  await expect(stop).toBeVisible()
  await expect(page.locator('.asst__listening')).toContainText('Слушаю')
  await page.waitForTimeout(1200)
  // Фальшивый микрофон пищит с паузами — запись могла кончиться сама на тишине.
  if (await stop.isVisible()) await stop.click()
}

const playedStates = (page, prefix) =>
  page.evaluate((pre) => window.__played.filter((p) => new URL(p.src, location.href).pathname.startsWith(pre) || p.src.startsWith(pre)).map((p) => p.state), prefix)

test('голосовой вопрос по-казахски: запись → текст → казахский ответ звучит потоком /api/tts', async ({ page }) => {
  const calls = await setup(page)
  await askByVoice(page)

  await expect(page.locator('.asst__msg--me')).toContainText('Үй жұмысы қайда?')
  await expect(page.getByRole('img', { name: 'Вопрос голосом' })).toBeVisible()
  expect(calls.stt).toHaveLength(1)
  expect(calls.stt[0].auth).toBe('Bearer test-token')
  // Настоящая WAV-запись, а не пустышка: заголовок RIFF и язык интерфейса в форме.
  expect(calls.stt[0].body).toContain('RIFF')
  expect(calls.stt[0].body).toContain('name="lang"')
  expect(calls.stt[0].size).toBeGreaterThan(5000)

  expect(calls.chat).toHaveLength(1)
  expect(calls.chat[0].voice).toBe(true)
  expect(calls.chat[0].messages.at(-1)).toEqual({ role: 'user', content: 'Үй жұмысы қайда?' })
  await expect(page.locator('.asst__msg--bot').last()).toContainText('сол жақ мәзірдегі')

  // У Gemini казахского нет — фраза сразу идёт потоком Soniox «Grace».
  await expect.poll(() => calls.tts.length).toBe(1)
  expect(calls.tts[0]).toMatchObject({ v: 'Grace', l: 'kk', t: 'Үй жұмысы — сол жақ мәзірдегі «Үй жұмысы» бөлімінде.' })
  expect(calls.speak).toHaveLength(0)
  await expect.poll(() => playedStates(page, '/api/tts')).toContain('playing')
  // Кнопка «звук» появилась после голосового вопроса.
  await expect(page.getByRole('button', { name: 'Выключить озвучку ответов' })).toBeVisible()
})

test('русский ответ — голос Луны (/api/assistant/speak)', async ({ page }) => {
  const calls = await setup(page, {
    sttText: 'Где моя домашка?',
    reply: 'Домашняя работа — в меню слева, раздел «Домашняя работа». ',
  })
  await askByVoice(page)
  await expect.poll(() => calls.speak.length).toBe(1)
  expect(calls.speak[0]).toEqual({ text: 'Домашняя работа — в меню слева, раздел «Домашняя работа».', lang: 'ru' })
  await expect.poll(() => playedStates(page, 'blob:')).toContain('playing')
  expect(calls.tts).toHaveLength(0)
})

test('Gemini не ответил — фраза звучит запасным голосом, а не пропадает', async ({ page }) => {
  const calls = await setup(page, {
    sttText: 'Где моя домашка?',
    reply: 'Домашняя работа — в меню слева, раздел «Домашняя работа». ',
    speakStatus: 502,
  })
  await askByVoice(page)
  await expect.poll(() => calls.tts.length).toBe(1)
  expect(calls.tts[0]).toMatchObject({ v: 'Grace', l: 'ru' })
  await expect.poll(() => playedStates(page, '/api/tts')).toContain('playing')
})

test('набранный вопрос — ответ только текстом, озвучки нет', async ({ page }) => {
  const calls = await setup(page, { reply: 'Домашка — в разделе «Домашняя работа» в меню слева. ' })
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  await page.getByRole('textbox').fill('где домашка')
  await page.getByRole('textbox').press('Enter')
  await expect(page.locator('.asst__msg--bot').last()).toContainText('в меню слева')
  expect(calls.chat[0].voice).toBe(false)
  await page.waitForTimeout(500)
  expect(calls.speak).toHaveLength(0)
  expect(calls.tts).toHaveLength(0)
})
