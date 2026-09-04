// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import { SpeakAct } from './SourceActs.jsx'

// Safari не умеет audio/webm ни писать, ни играть: MediaRecorder без опций
// пишет там audio/mp4. Пока блоб собирался захардкоженным 'audio/webm',
// <audio> получал mp4 под чужим ярлыком и молчал (длительность NaN).

const ACT = { speak: { q: 'How are you?', model: 'I am fine, thanks.' } }

/** Рекордер-дубль в поведении Safari: контейнер выбирает сам и объявляет его. */
class SafariRecorder {
  constructor(stream) {
    this.stream = stream
    this.state = 'inactive'
    this.mimeType = 'audio/mp4'
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) })
    this.onstop?.()
  }
}

let created = []

beforeEach(() => {
  created = []
  vi.stubGlobal('MediaRecorder', SafariRecorder)
  URL.createObjectURL = vi.fn((blob) => {
    created.push(blob)
    return 'blob:rec'
  })
  URL.revokeObjectURL = vi.fn()
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) },
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  delete navigator.mediaDevices
})

function mount() {
  return render(
    <I18nProvider>
      <SpeakAct act={ACT} slow={false} />
    </I18nProvider>,
  )
}

describe('SpeakAct — запись голоса', () => {
  it('отдаёт плееру блоб того типа, который писал рекордер', async () => {
    const { container } = mount()

    fireEvent.click(container.querySelector('.wb-recbtn'))
    await waitFor(() => expect(container.querySelector('.wb-recbtn.is-on')).toBeTruthy())

    fireEvent.click(container.querySelector('.wb-recbtn'))
    await waitFor(() => expect(container.querySelector('.wb-rec__audio')).toBeTruthy())

    expect(created).toHaveLength(1)
    expect(created[0].type).toBe('audio/mp4')
  })
})
