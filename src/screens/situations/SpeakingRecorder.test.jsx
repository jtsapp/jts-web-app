// @vitest-environment jsdom
// Баги ревью Практики 08.10.2026 в записи устного ответа «Ситуаций»:
//  #70 второй тап по «Записать», пока браузер спрашивает микрофон, заводил
//      второй поток и второй рекордер — первый писал в никуда, а его
//      микрофон не гас до ухода со страницы;
//  #71 код отказа сервера, которого нет в словаре (401 «Invalid or expired
//      access token.», «Audio file is empty.»), выводился сырым ключом
//      «situations.error.…».
// Плюс гонка той же природы: новая запись во время разбора получала разбор
// старой.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { StrictMode } from 'react'
import { I18nProvider } from '../../i18n.jsx'

const assessAnswer = vi.fn()
vi.mock('../../practice/situations/assessClient.js', () => ({
  assessAnswer: (...a) => assessAnswer(...a),
  fetchBudget: () => Promise.resolve(null),
}))
vi.mock('../../practice/situations/recordings.js', () => ({
  getTake: () => Promise.resolve(null),
  saveTake: () => Promise.resolve(),
  deleteTake: () => Promise.resolve(),
}))
vi.mock('../../lib/ielts-audio.js', () => ({
  blobToWav16kMono: () => Promise.resolve(new Blob(['wav'])),
  isMediaRecordingSupported: () => true,
}))
const reportUnauthorized = vi.fn()
vi.mock('../../lib/session.js', async (importOriginal) => ({
  ...(await importOriginal()),
  reportUnauthorized: (...a) => reportUnauthorized(...a),
}))

const { default: SpeakingRecorder } = await import('./SpeakingRecorder.jsx')

let recorders
let tracks
let pendingMic
function stubMic({ slow = false } = {}) {
  recorders = []
  tracks = []
  pendingMic = []
  const getUserMedia = vi.fn(() => {
    const track = { stop: vi.fn() }
    tracks.push(track)
    const stream = { getTracks: () => [track] }
    if (!slow) return Promise.resolve(stream)
    // Браузер ждёт ответа на запрос разрешения — промис висит, пока тест не отпустит.
    return new Promise((resolve) => pendingMic.push(() => resolve(stream)))
  })
  vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } })
  class FakeRecorder {
    static isTypeSupported() { return true }
    constructor() {
      this.state = 'inactive'
      this.mimeType = 'audio/webm'
      recorders.push(this)
    }
    start() { this.state = 'recording' }
    stop() {
      this.state = 'inactive'
      this.ondataavailable?.({ data: new Blob(['take']) })
      this.onstop?.()
    }
  }
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:take', revokeObjectURL: () => {} }))
  return getUserMedia
}

// StrictMode — как в dev приложения: эффекты проходят «монтирование → уборка →
// монтирование», и флаг «экран закрыт» после пробной уборки обязан вернуться.
function renderRecorder(token = 'tok') {
  return render(
    <StrictMode>
      <I18nProvider>
        <SpeakingRecorder level="a1" situation={1} task="Order a coffee" token={token} onRecorded={() => {}} />
      </I18nProvider>
    </StrictMode>,
  )
}

const micBtn = () => document.querySelector('.sit-rec__mic')
const assessBtn = () => document.querySelector('.sit-rec__go')
const errorText = () => document.querySelector('.sit-rec__error')?.textContent || ''

async function recordOnce() {
  fireEvent.click(micBtn())
  await waitFor(() => expect(document.querySelector('.sit-rec__state.is-live')).toBeTruthy())
  fireEvent.click(micBtn())
  await waitFor(() => expect(assessBtn().disabled).toBe(false))
}

beforeEach(() => {
  assessAnswer.mockReset()
  reportUnauthorized.mockReset()
})
afterEach(() => vi.unstubAllGlobals())

describe('Ситуации — двойной тап по «Записать» (#70)', () => {
  it('пока браузер спрашивает микрофон, второй тап не заводит второй поток', async () => {
    const getUserMedia = stubMic({ slow: true })
    renderRecorder()

    fireEvent.click(micBtn())
    fireEvent.click(micBtn())
    await act(async () => { pendingMic.forEach((go) => go()) })

    await waitFor(() => expect(document.querySelector('.sit-rec__state.is-live')).toBeTruthy())
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(recorders.length).toBe(1)
  })

  it('кнопка записи выключена, пока ждём микрофон', async () => {
    stubMic({ slow: true })
    renderRecorder()

    fireEvent.click(micBtn())

    expect(micBtn().disabled).toBe(true)
    await act(async () => { pendingMic.forEach((go) => go()) })
    await waitFor(() => expect(micBtn().disabled).toBe(false))
  })
})

describe('Ситуации — запись во время разбора', () => {
  it('пока идёт разбор, записать заново и удалить нельзя: разбор не достанется другой записи', async () => {
    stubMic()
    assessAnswer.mockImplementation(() => new Promise(() => {}))
    renderRecorder()
    await recordOnce()

    fireEvent.click(assessBtn())

    await waitFor(() => expect(micBtn().disabled).toBe(true))
    expect(document.querySelector('.sit-rec__tool--danger').disabled).toBe(true)
  })
})

describe('Ситуации — сообщение об ошибке разбора (#71)', () => {
  it('401 от сервера — понятный текст, а не сырой ключ, и сессия проверяется', async () => {
    stubMic()
    assessAnswer.mockRejectedValue(
      Object.assign(new Error('Invalid or expired access token.'), { status: 401, code: 'Invalid or expired access token.' }),
    )
    renderRecorder('tok')
    await recordOnce()

    fireEvent.click(assessBtn())

    await waitFor(() => expect(errorText()).not.toBe(''))
    expect(errorText()).not.toMatch(/situations\.error/)
    expect(errorText()).toMatch(/вход/i)
    expect(reportUnauthorized).toHaveBeenCalledWith('tok')
  })

  it('незнакомый код сервера — общий текст «что-то пошло не так»', async () => {
    stubMic()
    assessAnswer.mockRejectedValue(Object.assign(new Error('Audio file is empty.'), { status: 400, code: 'Audio file is empty.' }))
    renderRecorder()
    await recordOnce()

    fireEvent.click(assessBtn())

    await waitFor(() => expect(errorText()).not.toBe(''))
    expect(errorText()).not.toMatch(/situations\.error/)
    expect(errorText()).toMatch(/Что-то пошло не так/)
  })

  it('известный код по-прежнему даёт свой текст', async () => {
    stubMic()
    assessAnswer.mockRejectedValue(Object.assign(new Error('daily_limit_reached'), { status: 429, code: 'daily_limit_reached' }))
    renderRecorder()
    await recordOnce()

    fireEvent.click(assessBtn())

    await waitFor(() => expect(errorText()).toMatch(/Разборы на сегодня закончились/))
  })
})
