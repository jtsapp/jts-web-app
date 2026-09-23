// Разбор ответа в «Ситуациях»: длина ответа до пяти минут и порядок звеньев.
//
// Прод стоит за Cloudflare, который рвёт запрос (524), если сервер молчит
// дольше 100 секунд. Замер на 5 минутах речи (23.09.2026): потоковое
// распознавание 109 с, Fast Transcription 21 с, оценка произношения 57 с. Когда
// звенья шли друг за другом, пятиминутный ответ разбирался ~3 минуты и
// студент получал 524, а разбор при этом уже был списан. Поэтому тест держит
// порядок: текст — быстрым путём, произношение — параллельно с ним, потоковое
// распознавание не зовётся вовсе.
//
// Мокаются платные внешние сервисы (Azure, Soniox, Anthropic) и проверка
// токена у бэкенда; БД нет — лимит разборов тут не участвует.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const ext = vi.hoisted(() => ({
  azure: true,
  soniox: false,
  fast: null,
  pa: null,
  graded: null,
  calls: [],
}))

vi.mock('@/lib/ielts/azure-pronunciation.js', () => ({
  isAzureSpeechConfigured: () => ext.azure,
  transcribeWavFast: vi.fn(async () => {
    ext.calls.push('fast')
    return typeof ext.fast === 'function' ? ext.fast() : ext.fast
  }),
  transcribeWav: vi.fn(async () => {
    ext.calls.push('stream')
    return 'streamed text'
  }),
  // Длинный ответ оценивается кусками параллельно (см. azure-chunked.test.js);
  // целиком одним потоком роут его звать не должен.
  assessPronunciation: vi.fn(async () => {
    ext.calls.push('pa-whole')
    return null
  }),
  assessPronunciationChunked: vi.fn(async () => {
    ext.calls.push('pa')
    return typeof ext.pa === 'function' ? ext.pa() : ext.pa
  }),
}))

vi.mock('@/lib/soniox-stt.js', () => ({
  isSonioxConfigured: () => ext.soniox,
  transcribeWavSoniox: vi.fn(async () => {
    ext.calls.push('soniox')
    return 'soniox text'
  }),
}))

vi.mock('@/lib/anthropic.js', () => ({
  hasAnthropicKey: () => true,
  structured: vi.fn(async () => {
    ext.calls.push('grader')
    return ext.graded
  }),
}))

vi.mock('@/lib/auth-server.js', () => ({
  resolveProfileId: async () => ({ id: 'user-7', isDemoAccount: false }),
}))
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => false, getSql: () => null }))

import { GET, POST } from './route.js'
import { transcribeWav, transcribeWavFast, assessPronunciation, assessPronunciationChunked } from '@/lib/ielts/azure-pronunciation.js'

const PA = { accuracy: 88, fluency: 80, completeness: 95, prosody: 82, overall: 85, mock: false, transcript: 'text from pronunciation' }
const GRADED = {
  grammar: 70,
  vocabulary: 75,
  fluency: 80,
  coherence: 85,
  taskAchieved: true,
  errors: [],
  recommendations: ['Practise linkers'],
  summary: 'Good.',
}

// Тело нужной длины: роут считает секунды по размеру (16 кГц mono = 32000 Б/с).
function wavOf(seconds) {
  const buf = new Uint8Array(44 + Math.round(seconds * 32000))
  buf.set(new TextEncoder().encode('RIFF'), 0)
  return new File([buf], 'answer.wav', { type: 'audio/wav' })
}

function post(file) {
  const form = new FormData()
  form.append('audio', file)
  form.append('level', 'b1')
  form.append('task', 'Explain the gate change.')
  form.append('lang', 'ru')
  return POST(
    new Request('http://x/api/practice/situations/assess', {
      method: 'POST',
      headers: { Authorization: 'Bearer t' },
      body: form,
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(ext, { azure: true, soniox: false, fast: 'fast text', pa: PA, graded: GRADED, calls: [] })
})

describe('длина ответа', () => {
  it('принимает пятиминутный ответ', async () => {
    const res = await post(wavOf(300))
    expect(res.status).toBe(200)
    expect((await res.json()).transcript).toBe('fast text')
  })

  it('длиннее потолка — 413 с понятным кодом, платное не зовётся', async () => {
    const res = await post(wavOf(340))
    expect(res.status).toBe(413)
    expect(await res.json()).toMatchObject({ error: 'recording_too_long', limitMb: 10 })
    expect(ext.calls).toEqual([])
  })
})

describe('порядок звеньев', () => {
  it('произношение стартует, не дожидаясь текста', async () => {
    let release
    ext.fast = () => new Promise((r) => (release = () => r('fast text')))
    const pending = post(wavOf(60))
    await vi.waitFor(() => expect(transcribeWavFast).toHaveBeenCalled())
    // Текст ещё не пришёл, а оценка произношения уже идёт — кусками.
    expect(assessPronunciationChunked).toHaveBeenCalled()
    expect(assessPronunciation).not.toHaveBeenCalled()
    release()
    const res = await pending
    expect(res.status).toBe(200)
  })

  it('текст — быстрым путём, потоковое распознавание не зовётся', async () => {
    const body = await (await post(wavOf(60))).json()
    expect(body.transcript).toBe('fast text')
    expect(transcribeWav).not.toHaveBeenCalled()
    expect(body.engines).toEqual({ stt: 'azure-fast', pronunciation: 'azure' })
    expect(body.axes.pronunciation).toBe(88)
  })

  it('регион без Fast Transcription — текст из оценки произношения, без третьего вызова Azure', async () => {
    ext.fast = null
    const body = await (await post(wavOf(60))).json()
    expect(body.transcript).toBe('text from pronunciation')
    expect(transcribeWav).not.toHaveBeenCalled()
    expect(body.engines).toEqual({ stt: 'azure', pronunciation: 'azure' })
  })

  it('Azure молчит совсем — текст от Soniox, произношения нет, и ответ это говорит', async () => {
    Object.assign(ext, { fast: null, pa: null, soniox: true })
    const body = await (await post(wavOf(60))).json()
    expect(body.transcript).toBe('soniox text')
    expect(body.engines).toEqual({ stt: 'soniox', pronunciation: null })
    expect(body.axes.pronunciation).toBeNull()
  })

  it('речи нет — пустой разбор, грейдер не зовётся', async () => {
    ext.fast = ''
    const body = await (await post(wavOf(10))).json()
    expect(body.empty).toBe(true)
    expect(ext.calls).not.toContain('grader')
  })
})

describe('статус', () => {
  it('GET говорит, подключён ли Azure — проверка стенда без входа', async () => {
    const on = await (await GET(new Request('http://x/api/practice/situations/assess'))).json()
    expect(on).toMatchObject({ configured: true, azure: true })
    ext.azure = false
    ext.soniox = true
    const off = await (await GET(new Request('http://x/api/practice/situations/assess'))).json()
    expect(off).toMatchObject({ configured: true, azure: false })
  })
})
