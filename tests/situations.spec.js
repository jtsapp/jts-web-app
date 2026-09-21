import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Раздел «Ситуации» (?screen=situations&level=<a1..c1>): каталог уровня →
// сценарий → запись ответа → разбор.
//
// Ожидания не захардкожены: спека читает тот же <level>.json, что и экран.
// Правку материала тест переживёт, а разъехавшийся экран — нет.
//
// Микрофон и разбор подменяем: в CI нет ни микрофона, ни ключей Azure/Claude,
// а проверять надо именно поведение экрана — что запись засчитывает сценарий,
// что отказ лимита виден словами, что тишина не выглядит как поломка.

const dataFor = (level) =>
  JSON.parse(
    readFileSync(path.join(__dirname, '..', 'public', 'practice', 'situations', `${level}.json`), 'utf8'),
  )

const A1 = dataFor('a1')
const C1 = dataFor('c1')

const json = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

const openCatalog = async (page, level = 'a1') => {
  await page.goto(`/?screen=situations&level=${level}`)
  // Диплинк применяется эффектом ПОСЛЕ гидратации — ждём каталог.
  await expect(page.locator('.sit-cat__title')).toBeVisible({ timeout: 20000 })
}

const openItem = async (page, level, id) => {
  await page.goto(`/?screen=situations&level=${level}&item=${id}`)
  await expect(page.locator('.sit-view')).toBeVisible({ timeout: 20000 })
}

// Микрофон, которого в CI нет.
//
// `navigator.mediaDevices` — геттер прототипа, и простое присваивание Chrome
// молча проглатывает: тест тогда уходил в настоящий getUserMedia и получал
// отказ в правах. Поэтому defineProperty.
//
// Запись отдаём НАСТОЯЩИМ WAV, а не парой байтов: перед отправкой экран
// прогоняет blob через blobToWav16kMono → decodeAudioData, и мусор там падает
// раньше, чем дело дойдёт до разбора.
const fakeMicrophone = (page) =>
  page.addInitScript(() => {
    const stream = { getTracks: () => [{ stop() {} }], active: true }
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream },
    })

    const tone = (seconds = 0.3, rate = 16000) => {
      const n = Math.floor(seconds * rate)
      const buf = new ArrayBuffer(44 + n * 2)
      const view = new DataView(buf)
      const str = (off, text) => {
        for (let i = 0; i < text.length; i++) view.setUint8(off + i, text.charCodeAt(i))
      }
      str(0, 'RIFF')
      view.setUint32(4, 36 + n * 2, true)
      str(8, 'WAVE')
      str(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, rate, true)
      view.setUint32(28, rate * 2, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      str(36, 'data')
      view.setUint32(40, n * 2, true)
      // Не тишина: обрезка тишины перед отправкой иначе съела бы запись целиком.
      for (let i = 0; i < n; i++) view.setInt16(44 + i * 2, Math.sin(i / 8) * 3000, true)
      return new Blob([buf], { type: 'audio/wav' })
    }

    class FakeRecorder {
      static isTypeSupported() {
        return true
      }
      constructor() {
        this.state = 'inactive'
        this.mimeType = 'audio/wav'
      }
      start() {
        this.state = 'recording'
        setTimeout(() => this.ondataavailable?.({ data: tone() }), 10)
      }
      stop() {
        this.state = 'inactive'
        setTimeout(() => this.onstop?.(), 10)
      }
    }
    window.MediaRecorder = FakeRecorder
  })

// Залогиненный студент: кнопка разбора показывается только с токеном.
const asStudent = async (page) => {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'A1' } })),
  )
}

// Ответ разбора подменяем целиком: WAV из фейкового рекордера настоящий роут
// всё равно не примет, а проверяем мы карточку разбора.
const routeAssess = (page, response, status = 200) =>
  page.route('**/api/practice/situations/assess', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill(json({ configured: true, budget: { limit: 20, used: 3, remaining: 17 } }))
    }
    return route.fulfill(json(response, status))
  })

const record = async (page) => {
  await page.locator('.sit-rec__mic').click()
  await expect(page.locator('.sit-rec__state.is-live')).toBeVisible()
  await page.locator('.sit-rec__mic').click()
  await expect(page.locator('.sit-rec__state.is-live')).toHaveCount(0)
}

test.describe('каталог уровня', () => {
  test('десять сценариев уровня с заголовками из данных', async ({ page }) => {
    await openCatalog(page, 'a1')
    await expect(page.locator('.sit-card')).toHaveCount(10)
    await expect(page.locator('.sit-card__title').first()).toHaveText(A1.items[0].title.ru)
    await expect(page.locator('.sit-prog__count')).toContainText('0/10')
  })

  test('карточка ведёт в свой сценарий', async ({ page }) => {
    await openCatalog(page, 'a1')
    await page.locator('.sit-card').nth(2).click()
    await expect(page.locator('.sit-view__title')).toContainText(A1.items[2].title.en)
  })

  test('назад из каталога — в Практику', async ({ page }) => {
    await openCatalog(page, 'a1')
    await page.locator('.sit-back').click()
    await expect(page.locator('#sec-situations')).toBeVisible({ timeout: 20000 })
  })
})

test.describe('сценарий', () => {
  test('видео, диалог и задание — из данных уровня', async ({ page }) => {
    const item = A1.items[0]
    await openItem(page, 'a1', 1)
    await expect(page.locator('.sit-video video source')).toHaveAttribute('src', item.video)
    await expect(page.locator('.sit-video video')).toHaveAttribute('poster', item.poster)
    await expect(page.locator('.sit-beat')).toHaveCount(item.scene.lines.length)
    await expect(page.locator('.sit-task')).toContainText(item.task.en)
  })

  test('перевод реплики открывается по кнопке, а не сразу', async ({ page }) => {
    const line = A1.items[0].scene.lines[0]
    await openItem(page, 'a1', 1)
    const beat = page.locator('.sit-beat').first()
    // Смысл упражнения — сначала понять по-английски.
    await expect(beat).not.toContainText(line.ru)
    await beat.locator('.sit-ml__toggle', { hasText: 'RU' }).click()
    await expect(beat).toContainText(line.ru)
  })

  test('сцена C1 размечает ремарки и реплики студента', async ({ page }) => {
    await openItem(page, 'c1', 1)
    const lines = C1.items[0].scene.lines
    await expect(page.locator('.sit-beat--scene')).toHaveCount(lines.filter((l) => l.who === 'scene').length)
    await expect(page.locator('.sit-beat--you')).toHaveCount(lines.filter((l) => l.who === 'you').length)
  })

  test('возврат в каталог с экрана сценария', async ({ page }) => {
    await openItem(page, 'a1', 1)
    await page.locator('.sit-back').click()
    await expect(page.locator('.sit-card')).toHaveCount(10)
  })
})

test.describe('запись', () => {
  test.beforeEach(async ({ page }) => {
    await fakeMicrophone(page)
  })

  test('записанный ответ засчитывает сценарий и виден в каталоге', async ({ page }) => {
    await openItem(page, 'a1', 1)
    await expect(page.locator('.sit-view__flag')).toHaveCount(0)
    await record(page)
    // Зачёт вешаем на запись, а не на досмотренное видео: оно может не
    // проиграться, и тогда студент остался бы без отметки.
    await expect(page.locator('.sit-view__flag')).toBeVisible()
    await page.locator('.sit-back').click()
    await expect(page.locator('.sit-prog__count')).toContainText('1/10')
    await expect(page.locator('.sit-card.is-done')).toHaveCount(1)
  })

  test('до записи слушать и удалять нечего', async ({ page }) => {
    await openItem(page, 'a1', 1)
    await expect(page.locator('.sit-rec__tool--danger')).toBeDisabled()
    await expect(page.locator('.sit-rec__tool').last()).toBeDisabled()
  })

  test('гостю предлагают войти вместо кнопки разбора', async ({ page }) => {
    await openItem(page, 'a1', 1)
    await expect(page.locator('.sit-rec__guest')).toBeVisible()
    await expect(page.locator('.sit-rec__go')).toHaveCount(0)
  })
})

test.describe('разбор', () => {
  test.beforeEach(async ({ page }) => {
    await fakeMicrophone(page)
    await asStudent(page)
  })

  test('карточка разбора показывает итог, оси и советы', async ({ page }) => {
    await routeAssess(page, {
      transcript: 'hello my name is saken i am from almaty',
      seconds: 9,
      overall: 78,
      axes: { grammar: 80, pronunciation: 72, vocabulary: 75, fluency: 82, coherence: 70 },
      errors: [{ bad: 'i am from almaty', good: "I'm from Almaty", note: 'Имя собственное с большой буквы' }],
      recommendations: ['Скажите ещё одно предложение о себе.'],
      summary: 'Хорошее начало.',
      budget: { limit: 20, used: 4, remaining: 16 },
    })
    await openItem(page, 'a1', 1)
    await record(page)
    await page.locator('.sit-rec__go').click()

    await expect(page.locator('.sit-fb__ring')).toContainText('78')
    await expect(page.locator('.sit-fb__axis')).toHaveCount(5)
    await expect(page.locator('.sit-fb__transcript')).toContainText('hello my name is saken')
    await expect(page.locator('.sit-fb__good')).toContainText("I'm from Almaty")
    await expect(page.locator('.sit-fb__recs li')).toHaveCount(1)
    await expect(page.locator('.sit-rec__budget')).toContainText('16')
  })

  test('ось без данных показана прочерком, а не нулём', async ({ page }) => {
    await routeAssess(page, {
      transcript: 'hello',
      seconds: 3,
      overall: 71,
      // Azure не ответил — произношения нет. Ноль студент прочтёт как приговор.
      axes: { grammar: 70, pronunciation: null, vocabulary: 72, fluency: 70, coherence: 71 },
      errors: [],
      recommendations: [],
      summary: '',
      budget: null,
    })
    await openItem(page, 'a1', 1)
    await record(page)
    await page.locator('.sit-rec__go').click()

    const pron = page.locator('.sit-fb__axis').nth(1)
    await expect(pron).toContainText('—')
    await expect(pron).not.toContainText('0')
  })

  test('тишина — это «не расслышали», а не поломка', async ({ page }) => {
    await routeAssess(page, { empty: true, seconds: 4, budget: { limit: 20, used: 3, remaining: 17 } })
    await openItem(page, 'a1', 1)
    await record(page)
    await page.locator('.sit-rec__go').click()

    await expect(page.locator('.sit-rec__error')).toContainText('не расслышали')
    await expect(page.locator('.sit-fb')).toHaveCount(0)
  })

  test('исчерпанный дневной лимит объяснён словами', async ({ page }) => {
    await routeAssess(
      page,
      { error: 'daily_limit_reached', budget: { limit: 20, used: 20, remaining: 0 } },
      429,
    )
    await openItem(page, 'a1', 1)
    await record(page)
    await page.locator('.sit-rec__go').click()

    await expect(page.locator('.sit-rec__error')).toContainText('Разборы на сегодня закончились')
    // Записывать себя лимит не трогает — кнопка микрофона жива.
    await expect(page.locator('.sit-rec__mic')).toBeEnabled()
  })

  test('без записи разбирать нечего', async ({ page }) => {
    await routeAssess(page, {})
    await openItem(page, 'a1', 1)
    await expect(page.locator('.sit-rec__go')).toBeDisabled()
  })
})
