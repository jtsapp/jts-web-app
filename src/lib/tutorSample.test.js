// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { playTutorSample } from './ielts-audio.js'

// Контракт кнопки «послушать»: звучит ровно одна визитка — последняя нажатая.
// Тонкость, ради которой тест и написан: Audio.play() асинхронный, и пауза,
// поставленная следующим нажатием, прилетает предыдущему как отказ промиса.
// Обработчики отказа обязаны понимать, что их уже сменили, иначе они гасят
// звук, который только что начался, и быстрый двойной клик даёт тишину.

const created = []

class FakeAudio {
  constructor(src) {
    this.src = src
    this.paused = true
    this.volume = 1
    this.onended = null
    this.onerror = null
    // Отложенный резолв: имитируем реальный play(), который не завершается
    // мгновенно — именно в этом зазоре и живёт гонка.
    this._resolve = null
    this._reject = null
    created.push(this)
  }

  play() {
    return new Promise((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
  }

  // Успешный старт воспроизведения.
  settle() {
    this.paused = false
    this._resolve?.()
  }

  pause() {
    this.paused = true
    // Браузер отклоняет незавершённый play() при паузе — воспроизводим это.
    this._reject?.(new DOMException('interrupted by pause', 'AbortError'))
  }
}

beforeEach(() => {
  created.length = 0
  vi.stubGlobal('Audio', FakeAudio)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('playTutorSample', () => {
  it('берёт файл выбранного тьютора', async () => {
    const p = playTutorSample('luna')
    created[0].settle()
    await expect(p).resolves.toBe('sample')
    expect(created[0].src).toContain('/tutor/voice/luna.mp3')
  })

  it('без тьютора не создаёт звук', async () => {
    await expect(playTutorSample('')).resolves.toBe('none')
    expect(created).toHaveLength(0)
  })

  it('другой тьютор глушит предыдущего', async () => {
    const first = playTutorSample('dexter')
    created[0].settle()
    await first

    const second = playTutorSample('spark')
    created[1].settle()
    await expect(second).resolves.toBe('sample')

    expect(created[0].paused).toBe(true)
    expect(created[1].paused).toBe(false)
    expect(created[1].src).toContain('spark')
  })

  it('быстрый повтор по тому же: играет только последнее нажатие', async () => {
    // Оба клика до того, как первый успел стартовать — это и есть реальный
    // двойной тап по кнопке.
    const first = playTutorSample('luna')
    const second = playTutorSample('luna')
    created[1].settle()

    // Первое нажатие отчитывается, что его сменили, и НЕ трогает общий стоп.
    await expect(first).resolves.toBe('superseded')
    await expect(second).resolves.toBe('sample')

    expect(created).toHaveLength(2)
    expect(created[0].paused).toBe(true)
    // Главное: второй звук пережил отказ первого и продолжает играть.
    expect(created[1].paused).toBe(false)
  })

  it('три клика подряд оставляют играть только третий', async () => {
    const a = playTutorSample('luna')
    const b = playTutorSample('dexter')
    const c = playTutorSample('spark')
    created[2].settle()

    await expect(a).resolves.toBe('superseded')
    await expect(b).resolves.toBe('superseded')
    await expect(c).resolves.toBe('sample')

    expect(created.filter((x) => !x.paused)).toHaveLength(1)
    expect(created[2].src).toContain('spark')
  })

  it('onended устаревшего нажатия не глушит текущее', async () => {
    const first = playTutorSample('luna')
    const stale = created[0]
    const second = playTutorSample('spark')
    created[1].settle()
    await first
    await second

    // Досрочный onended от уже смененного звука не должен ничего останавливать.
    const onEnd = vi.fn()
    stale.onended?.()
    expect(onEnd).not.toHaveBeenCalled()
    expect(created[1].paused).toBe(false)
  })
})
