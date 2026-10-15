import { describe, it, expect, vi, beforeEach } from 'vitest'

// Тест про транспорт и доступ: кого пускаем, что уходит в модель, как ответ
// доезжает. Что скажет модель — не его дело, поэтому Anthropic и проверка
// токена замоканы целиком.
const calls = []
let streamImpl
vi.mock('@/lib/anthropic.js', () => ({
  hasAnthropicKey: () => process.env.ANTHROPIC_API_KEY !== '',
  chatStreamRich(args) {
    calls.push(args)
    return streamImpl()
  },
}))

let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
}))

// Профиль ученика — отдельный модуль (studentContext.js), сам отказоустойчив
// и кэширует; здесь только проверяем, что роут его зовёт с бэрер-токеном и
// не падает, если он бросит исключение.
let studentContextResult
let studentContextThrows = false
vi.mock('@/lib/assistant/studentContext.js', () => ({
  loadStudentContext: vi.fn(async (bearer) => {
    if (studentContextThrows) throw new Error('backend недоступен')
    return studentContextResult
  }),
}))
const { loadStudentContext } = await import('@/lib/assistant/studentContext.js')

const { saveCalls } = vi.hoisted(() => ({ saveCalls: [] }))
vi.mock('@/lib/db/assistantErrorReports.js', () => ({
  saveAssistantErrorReport: vi.fn(async (row) => {
    saveCalls.push(row)
    return true
  }),
}))
const { saveAssistantErrorReport } = await import('@/lib/db/assistantErrorReports.js')

// Заметки Луны-трекера (lib/db/assistantTracker.js): здесь — что и когда роут просит записать.
vi.mock('@/lib/db/assistantTracker.js', () => ({ saveAdviceNote: vi.fn(async () => true) }))
const { saveAdviceNote } = await import('@/lib/db/assistantTracker.js')

const { POST } = await import('./route.js')

const post = (body, token = 'student-token') =>
  POST(
    new Request('http://localhost/api/assistant/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )

const question = (userId = 1) => {
  authResult = { status: 'ok', user: { userId, name: 'Толик', languageLevel: 'A1' } }
  return {
    messages: [{ role: 'user', content: 'Почему мой ответ неверный?' }],
    screen: { id: 'lesson-workspace', text: 'Clare is reading. [поле: ученик ввёл «Is Cleare reading?»]' },
    lang: 'ru',
  }
}

describe('POST /api/assistant/chat', () => {
  beforeEach(() => {
    calls.length = 0
    process.env.ANTHROPIC_API_KEY = 'k'
    studentContextResult = null
    studentContextThrows = false
    loadStudentContext.mockClear()
    saveCalls.length = 0
    saveAssistantErrorReport.mockClear()
    saveAdviceNote.mockClear()
    streamImpl = async function* () {
      yield { type: 'text', text: 'Опечатка: ' }
      yield { type: 'text', text: '«Cleare» → «Clare».' }
      yield { type: 'done', stopReason: 'end_turn' }
    }
  })

  it('стримит ответ модели текстом, без буферизации nginx', async () => {
    const res = await post(question(101))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(res.headers.get('x-accel-buffering')).toBe('no')
    expect(await res.text()).toBe('Опечатка: «Cleare» → «Clare».')
  })

  it('отдаёт модели правила, экран и профиль — и помечает стоимость как site_assistant', async () => {
    await (await post(question(102))).text()
    expect(calls).toHaveLength(1)
    const { systemPrompt, messages, task } = calls[0]
    expect(task).toBe('site_assistant')
    expect(systemPrompt).toContain('База знаний о сайте')
    const last = messages.at(-1).content
    expect(last).toContain('Имя ученика: Толик')
    expect(last).toContain('ученик ввёл «Is Cleare reading?»')
    expect(last).toContain('Вопрос ученика: Почему мой ответ неверный?')
    // Снимок экрана не должен попадать в системный промпт: тот кэшируется и
    // обязан быть одинаковым для всех учеников.
    expect(systemPrompt).not.toContain('Is Cleare reading?')
  })

  it('зовёт loadStudentContext с бэрер-токеном ученика и кладёт результат в вопрос', async () => {
    studentContextResult = 'Домашка (1 к сроку на этой неделе): «Эссе» — до 2026-09-25.'
    await (await post(question(108), 'my-bearer')).text()
    expect(loadStudentContext).toHaveBeenCalledWith('my-bearer', expect.objectContaining({ userId: 108 }))
    const last = calls[0].messages.at(-1).content
    expect(last).toContain('Профиль ученика')
    expect(last).toContain('«Эссе» — до 2026-09-25.')
  })

  it('без профиля (студент новый / ничего не собралось) блока просто нет', async () => {
    studentContextResult = null
    await (await post(question(109))).text()
    expect(calls[0].messages.at(-1).content).not.toContain('Профиль ученика')
  })

  it('упавший studentContext не роняет чат — план остаётся без персонализации', async () => {
    studentContextThrows = true
    const res = await post(question(110))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Опечатка: «Cleare» → «Clare».')
    expect(calls[0].messages.at(-1).content).not.toContain('Профиль ученика')
  })

  it('без токена — 401, модель не зовём', async () => {
    authResult = { status: 'unauthorized', user: null }
    const res = await post({ messages: [{ role: 'user', content: 'q' }] }, null)
    expect(res.status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  it('бэкенд авторизации лежит — 503, а не «сессия истекла»', async () => {
    authResult = { status: 'unavailable', user: null }
    expect((await post({ messages: [{ role: 'user', content: 'q' }] })).status).toBe(503)
  })

  it('без ключа модели — 503', async () => {
    process.env.ANTHROPIC_API_KEY = ''
    const body = question(103)
    expect((await post(body)).status).toBe(503)
    expect(calls).toHaveLength(0)
  })

  it('кривой JSON и пустой разговор — 400', async () => {
    question(104)
    expect((await post('{not json')).status).toBe(400)
    expect((await post({ messages: [] })).status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('после лимита — 429 с Retry-After', async () => {
    const body = question(105)
    for (let i = 0; i < 20; i += 1) await (await post(body)).text()
    const res = await post(body)
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(calls).toHaveLength(20)
  })

  it('обрыв модели посреди ответа — ошибка чтения, а не полуфраза как готовый ответ', async () => {
    streamImpl = async function* () {
      yield { type: 'text', text: 'Начало' }
      throw new Error('overloaded')
    }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await post(question(106))
    await expect(res.text()).rejects.toThrow()
    errSpy.mockRestore()
  })
  describe('вопросы не по теме', () => {
    const offtopicStream = () => {
      let closed = false
      streamImpl = async function* () {
        try {
          yield { type: 'text', text: '[[OFF' }
          yield { type: 'text', text: 'TOPIC]]' }
          yield { type: 'text', text: ' а вот и лишний текст' }
        } finally {
          closed = true
        }
      }
      return () => closed
    }

    it('метка → стандартный отказ на языке ученика, генерация закрыта', async () => {
      const wasClosed = offtopicStream()
      const res = await post({ ...question(201), lang: 'en' })
      expect(res.status).toBe(200)
      expect(res.headers.get('x-assistant-offtopic')).toBe('1')
      expect(await res.text()).toBe('I can only help with English and with the JTS site. Ask me, for example, why an answer was not accepted, what rule an exercise uses, or how a section works.')
      expect(wasClosed()).toBe(true)
    })

    it('не тратит основной лимит, но после пяти за сутки — пауза', async () => {
      const body = question(202)
      for (let i = 0; i < 4; i += 1) {
        offtopicStream()
        expect((await post(body)).headers.get('x-assistant-offtopic')).toBe('1')
      }
      offtopicStream()
      await post(body)
      const paused = await post(body)
      expect(paused.status).toBe(429)
      expect((await paused.json()).error).toBe('offtopic_cooldown')
    })

    it('отказы не съедают основной лимит', async () => {
      const body = question(203)
      for (let i = 0; i < 4; i += 1) {
        offtopicStream()
        await post(body)
      }
      streamImpl = async function* () {
        yield { type: 'text', text: 'ok' }
      }
      for (let i = 0; i < 20; i += 1) expect((await post(body)).status).toBe(200)
    })

    it('обрыв на куске метки — тоже отказ, а не «[[OFF» ученику', async () => {
      streamImpl = async function* () {
        yield { type: 'text', text: '[[OFF' }
      }
      const res = await post(question(204))
      expect(res.headers.get('x-assistant-offtopic')).toBe('1')
    })

    it('ответ, который просто начинается со скобки, идёт как есть', async () => {
      streamImpl = async function* () {
        yield { type: 'text', text: '[' }
        yield { type: 'text', text: 'пример] Is Clare reading?' }
      }
      const res = await post(question(205))
      expect(res.headers.get('x-assistant-offtopic')).toBeNull()
      expect(await res.text()).toBe('[пример] Is Clare reading?')
    })
  })

  it('модель упала до первого слова — 502, и лимит не потрачен', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    streamImpl = async function* () {
      throw new Error('overloaded')
    }
    const body = question(206)
    for (let i = 0; i < 25; i += 1) expect((await post(body)).status).toBe(502)
    errSpy.mockRestore()
  })

  it('пустой ответ модели — 502, а не пустой пузырь', async () => {
    streamImpl = async function* () {
      yield { type: 'done', stopReason: 'end_turn' }
    }
    expect((await post(question(207))).status).toBe(502)
  })

  it('поломка сайта: ученику без метки, отчёт в БД с местом и сбоями', async () => {
    streamImpl = async function* () {
      yield { type: 'text', text: 'Похоже, урок не открывается. Обновите страницу. Если не поможет — передам команде.\n' }
      yield { type: 'text', text: '[[REPORT_BUG]]\nРаздел: Урок\nАдрес: https://app.example/lesson/12\nЧто: белый экран после «Начать»\nСбои: ChunkLoadError' }
    }
    const body = {
      ...question(301),
      messages: [{ role: 'user', content: 'урок не открывается, белый экран' }],
      pageUrl: 'https://app.example/lesson/12',
      userAgent: 'Mozilla/5.0 JTS',
      errors: [{ at: 1, message: 'ChunkLoadError', source: 'app.js:4' }],
    }
    const res = await post(body)
    const text = await res.text()
    expect(text).toContain('Похоже, урок не открывается')
    expect(text).not.toContain('[[REPORT_BUG]]')
    expect(text).toContain('[[ASST_REPORTED]]')
    expect(text).not.toContain('ChunkLoadError')
    expect(saveAssistantErrorReport).toHaveBeenCalledTimes(1)
    expect(saveCalls[0]).toMatchObject({
      profileId: 'user-301',
      userId: 301,
      lang: 'ru',
      screenId: 'lesson-workspace',
      pageUrl: 'https://app.example/lesson/12',
      userAgent: 'Mozilla/5.0 JTS',
      userMessage: 'Ученик: урок не открывается, белый экран',
    })
    expect(saveCalls[0].assistantSummary).toContain('Раздел: Урок')
    expect(saveCalls[0].assistantSummary).toContain('белый экран')
    expect(saveCalls[0].clientErrors[0].message).toBe('ChunkLoadError')
  })

  it('обычный ответ про опечатку в БД не пишет', async () => {
    await (await post(question(302))).text()
    expect(saveAssistantErrorReport).not.toHaveBeenCalled()
  })

  it('чип «ошибка» + описание — отчёт даже без метки модели, чат с начала', async () => {
    streamImpl = async function* () {
      yield { type: 'text', text: 'Понял: аудио обрывается. Обновите страницу. Ошибку уже передал команде.\n' }
    }
    const res = await post({
      ...question(303),
      messages: [
        { role: 'user', content: 'На сайте ошибка' },
        { role: 'assistant', content: 'Расскажите подробнее' },
        { role: 'user', content: 'на втором упражнении аудио обрывается через 2 секунды' },
      ],
      pageUrl: 'https://dev-tutor.justtostudy.kz/',
    })
    const text = await res.text()
    expect(text).toContain('аудио обрывается')
    expect(text).toContain('[[ASST_REPORTED]]')
    expect(saveCalls[0].userMessage).toContain('Ученик: На сайте ошибка')
    expect(saveCalls[0].userMessage).toContain('аудио обрывается через 2 секунды')
    expect(saveCalls[0].assistantSummary).toMatch(/Автоматически/)
  })

  it('повтор в том же чате дописывает карточку, ученику метку не дублирует', async () => {
    streamImpl = async function* () {
      yield { type: 'text', text: 'Уже передал.\n[[REPORT_BUG]]\nповтор' }
    }
    const text = await (await post({
      ...question(304),
      bugReported: true,
      messages: [
        { role: 'user', content: 'На сайте ошибка' },
        { role: 'assistant', content: 'ок' },
        { role: 'user', content: 'аудио всё ещё обрывается через 2 секунды' },
      ],
    })).text()
    expect(text).toContain('Уже передал')
    expect(text).not.toContain('[[ASST_REPORTED]]')
    expect(saveCalls[0].updateLatest).toBe(true)
    expect(saveCalls[0].userMessage).toContain('На сайте ошибка')
    expect(saveCalls[0].userMessage).toContain('аудио всё ещё обрывается')
  })

  it('метка «открыть раздел» уходит хвостом, а не в текст — даже разрезанная кусками', async () => {
    streamImpl = async function* () {
      yield { type: 'text', text: 'Говорение тренируют в Практике, вкладка «Говорение». Открыть?\n[[OP' }
      yield { type: 'text', text: 'EN practice-spea' }
      yield { type: 'text', text: 'king]]' }
    }
    const text = await (await post(question(401))).text()
    expect(text).toContain('Открыть?')
    expect(text).not.toContain('[[OPEN')
    expect(text.endsWith('[[ASST_ACTION open practice-speaking offer]]')).toBe(true)
  })

  it('«открой сейчас» и тур — свой вид хвоста; раздел не из списка не уходит вовсе', async () => {
    streamImpl = async function* () {
      yield { type: 'text', text: 'Начинаю тур по Практике.\n[[TOUR_NOW practice]]' }
    }
    expect(await (await post(question(402))).text()).toBe('Начинаю тур по Практике.\n[[ASST_ACTION tour practice now]]')

    streamImpl = async function* () {
      yield { type: 'text', text: 'Открываю.\n[[OPEN_NOW ielts-mock]]' }
    }
    expect(await (await post(question(403))).text()).toBe('Открываю.\n')
  })

  it('метка действия и запись поломки в одном ответе — оба хвоста, действие первым', async () => {
    streamImpl = async function* () {
      yield { type: 'text', text: 'Передала команде. Можно пока потренироваться в Словаре.\n[[OPEN vocab]]\n' }
      yield { type: 'text', text: '[[REPORT_BUG]]\nРаздел: Урок' }
    }
    const text = await (await post({ ...question(404), messages: [{ role: 'user', content: 'урок не открывается, белый экран' }] })).text()
    expect(text).not.toContain('[[OPEN')
    expect(text).toMatch(/\[\[ASST_ACTION open vocab offer\]\]\[\[ASST_REPORTED\]\]$/)
  })

  it('модели в системном промпте приходит список разделов, которые можно открыть', async () => {
    await (await post(question(405))).text()
    expect(calls[0].systemPrompt).toContain('## Разделы, которые ты умеешь открывать')
    expect(calls[0].systemPrompt).toContain('- practice-speaking — Практика → Говорение')
    expect(calls[0].systemPrompt).toContain('[[TOUR_NOW id]]')
  })

  // Ученик открыл окно, и Луна заговаривает первой (lib/assistant/opening.js).
  describe('первая реплика при открытии окна', () => {
    const opening = (userId, extra = {}) => ({
      ...question(userId),
      messages: [{ role: 'user', content: '[ученик открыл окно]' }],
      ...extra,
    })

    it('уходит в модель с сегодняшней датой и пометкой вместо «вопроса ученика»', async () => {
      await (await post(opening(501))).text()
      const last = calls[0].messages.at(-1).content
      expect(last).toMatch(/Сегодня: \d{4}-\d{2}-\d{2}/)
      expect(last).toMatch(/<\/контекст>\n\n\[ученик открыл окно\]\nЯзык ответа: русский\n/)
      expect(last).toMatch(/Не больше 4 коротких предложений\.$/)
      expect(last).not.toContain('Вопрос ученика:')
    })

    it('отказ «не по теме» вместо реплики — 502 без паузы ученику, следующий вопрос проходит', async () => {
      for (let i = 0; i < 6; i += 1) {
        streamImpl = async function* () {
          yield { type: 'text', text: '[[OFFTOPIC]]' }
        }
        const res = await post(opening(502))
        expect(res.status).toBe(502)
        expect(res.headers.get('x-assistant-offtopic')).toBeNull()
      }
      streamImpl = async function* () {
        yield { type: 'text', text: 'Опечатка.' }
      }
      const res = await post(question(502))
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Опечатка.')
    })

    it('поломку сама не передаёт — даже если модель поставила метку', async () => {
      streamImpl = async function* () {
        yield { type: 'text', text: 'Здравствуйте. Вижу сбой на экране.\n[[REPORT_BUG]]\nРаздел: Урок' }
      }
      const text = await (await post(opening(503, { errors: [{ at: 1, message: 'ChunkLoadError' }] }))).text()
      expect(text).toBe('Здравствуйте. Вижу сбой на экране.\n')
      expect(saveAssistantErrorReport).not.toHaveBeenCalled()
    })

    // После чипа «ошибка» любая реплика ученика длиннее 16 знаков — уже описание поломки (shouldAutoReportBug).
    // Пометка открытия — не его слова: ни отчёта по ней, ни её текста в «словах ученика».
    it('пометка после чипа «ошибка» описанием поломки не считается', async () => {
      await (await post({
        ...question(504),
        messages: [
          { role: 'user', content: 'На сайте ошибка' },
          { role: 'assistant', content: 'Что именно не работает?' },
          { role: 'user', content: '[ученик открыл окно]' },
          { role: 'assistant', content: 'Здравствуйте. Вы на Главной.' },
          { role: 'user', content: 'спасибо' },
        ],
      })).text()
      expect(saveAssistantErrorReport).not.toHaveBeenCalled()
    })
  })

  // Трекер: совет Луны — её предложение открыть раздел — ложится одной строкой (lib/db/assistantTracker.js).
  describe('заметка о совете', () => {
    // «Главная»: не экран задания — первая реплика там может предлагать раздел.
    const HOME = { id: 'home', text: 'Главная ВАШ УРОВЕНЬ A2' }
    const offer = (text) => {
      streamImpl = async function* () {
        yield { type: 'text', text }
      }
    }

    it('предложение открыть раздел — заметка: раздел и сам совет без вопроса-кнопки', async () => {
      offer('Вы на Главной. У вас домашка «Unit 4» до 17 октября — с неё и стоит начать. Открыть?\n[[OPEN homework]]')
      const text = await (await post(question(601))).text()
      expect(text).toMatch(/\[\[ASST_ACTION open homework offer\]\]$/)
      expect(saveAdviceNote).toHaveBeenCalledWith('user-601', {
        target: 'homework',
        advice: 'Вы на Главной. У вас домашка «Unit 4» до 17 октября — с неё и стоит начать.',
      })
    })

    it('«открой» по просьбе ученика, тур и ответ без метки — не советы', async () => {
      offer('Открываю Словарь.\n[[OPEN_NOW vocab]]')
      await (await post(question(602))).text()
      offer('Начинаю тур по Главной.\n[[TOUR_NOW home]]')
      await (await post(question(602))).text()
      await (await post(question(602))).text()
      expect(saveAdviceNote).not.toHaveBeenCalled()
    })

    it('в первой реплике переход — всегда предложение: пишется и ошибочный _NOW', async () => {
      offer('Начните со словаря. Открываю.\n[[OPEN_NOW vocab]]')
      await (await post({ ...question(603), screen: HOME, messages: [{ role: 'user', content: '[ученик открыл окно]' }] })).text()
      expect(saveAdviceNote).toHaveBeenCalledWith('user-603', expect.objectContaining({ target: 'vocab' }))
    })

    it('первая реплика без метки, но с «Открыть …?» про «Совет сайта» — кнопка и заметка всё равно есть', async () => {
      studentContextResult =
        'Совет сайта, что сделать сейчас: Аудирование: мини-игра — самый слабый навык — listening (метка [[OPEN listening]]).'
      offer('Аудирование у вас слабее всего. Открыть мини-игру?')
      const opening = { ...question(605), screen: HOME, messages: [{ role: 'user', content: '[ученик открыл окно]' }] }
      expect(await (await post(opening)).text()).toMatch(/Открыть мини-игру\?\[\[ASST_ACTION open listening offer\]\]$/)
      expect(saveAdviceNote).toHaveBeenCalledWith('user-605', expect.objectContaining({ target: 'listening' }))
      // На обычный вопрос не додумываем: там метка — решение модели.
      saveAdviceNote.mockClear()
      offer('Аудирование у вас слабее всего. Открыть мини-игру?')
      expect(await (await post(question(605))).text()).not.toContain('ASST_ACTION')
      expect(saveAdviceNote).not.toHaveBeenCalled()
    })

    it('первая реплика на экране задания — без кнопки и без заметки, даже если модель позвала', async () => {
      offer('Доделайте урок, а потом — домашка. Открыть?\n[[OPEN homework]]')
      // question(): экран урока с полем ответа — задание.
      const text = await (await post({ ...question(606), messages: [{ role: 'user', content: '[ученик открыл окно]' }] })).text()
      expect(text).toMatch(/^Доделайте урок, а потом — домашка\. Открыть\?\s*$/)
      expect(text).not.toContain('ASST_ACTION')
      expect(saveAdviceNote).not.toHaveBeenCalled()
    })

    it('заметка не записалась — ответ всё равно доходит целиком', async () => {
      saveAdviceNote.mockRejectedValueOnce(new Error('db down'))
      offer('С домашки и начните. Открыть?\n[[OPEN homework]]')
      const res = await post(question(604))
      expect(res.status).toBe(200)
      expect(await res.text()).toMatch(/С домашки и начните\. Открыть\?\n\[\[ASST_ACTION open homework offer\]\]$/)
    })
  })
})
