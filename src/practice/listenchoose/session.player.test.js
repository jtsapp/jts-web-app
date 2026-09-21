// Контроллер набора + настоящий ListenPlayer на фейковом audio. Юниты session.test.js
// гоняют контроллер с игрушечным плеером и не видят порядка «остановить →
// сбросить прослушанное → потребовать слушать заново»: здесь он проверяется
// живьём, на тех же событиях, что шлёт браузер.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { makeFakeAudio } from './__fixtures__/fakeAudio.js'
import { buildData } from './data.js'
import { normalizeDevice } from './listenchooseSettings.js'
import { ListenPlayer } from './player.js'
import { ListenChooseSession } from './session.js'

const ROOT = path.join(__dirname, '..', '..', '..')
const DATA = buildData(JSON.parse(readFileSync(path.join(ROOT, 'public', 'practice', 'listenchoose', 'questions.json'), 'utf8')))

function build() {
  let clock = 0
  const fake = makeFakeAudio()
  let dev = normalizeDevice({})
  const device = { read: () => dev, write: (patch) => (dev = normalizeDevice({ ...dev, ...patch })) }
  const progress = { readSeen: () => [], writeSeen: vi.fn() }
  const session = new ListenChooseSession({
    data: DATA,
    device,
    progress,
    preload: () => [],
    random: () => 0.3,
    createPlayer: (o) => new ListenPlayer({ audio: fake.audio, now: () => clock, ...o }),
  })
  const snap = () => session.getSnapshot()
  // Проиграть запись целиком: событие за событием, как браузер.
  const listenThrough = (duration = 6) => {
    Object.assign(fake.audio, { duration, readyState: 4, paused: false, ended: false, currentTime: 0 })
    fake.fire('loadedmetadata')
    clock += 10
    fake.fire('playing')
    for (let t = 0.25; t < duration + 0.001; t += 0.25) {
      clock += 250
      fake.audio.currentTime = Math.min(t, duration)
      fake.fire('timeupdate')
    }
    Object.assign(fake.audio, { paused: true, ended: true, currentTime: duration })
    fake.fire('pause')
    fake.fire('ended')
  }
  return { session, snap, fake, listenThrough, player: session.player }
}

describe('контроллер с настоящим плеером', () => {
  it('дослушал → выбор открыт; ошибка → «слушай заново»: старое прослушивание не считается', () => {
    const h = build()
    h.session.setImagesReady(true, h.snap().question.id)
    expect(h.snap().heard).toBe(false)

    h.listenThrough()
    expect(h.snap().heard).toBe(true)

    const q = h.snap().question
    const wrong = [0, 1, 2, 3].find((i) => i !== q.answer)
    expect(h.session.answer(wrong)).toBe(true)
    expect(h.snap().heard).toBe(false)
    expect(h.player.coverage()).toBe(0)

    // Без нового проигрывания одно лишь событие ended засчитаться не может.
    h.fake.fire('ended')
    expect(h.snap().heard).toBe(false)
    expect(h.session.answer(q.answer)).toBe(false)

    // Послушал заново — можно выбирать, и верный ответ закрывает задание.
    h.player.replay()
    h.listenThrough()
    expect(h.snap().heard).toBe(true)
    expect(h.session.answer(q.answer)).toBe(true)
    expect(h.snap().round).toMatchObject({ resolved: true, correct: true, attempts: 2 })
  })

  it('перемотка в конец не даёт «дослушал»', () => {
    const h = build()
    h.session.setImagesReady(true, h.snap().question.id)
    Object.assign(h.fake.audio, { duration: 6, readyState: 4 })
    h.fake.fire('loadedmetadata')
    h.player.play()
    h.fake.fire('playing')
    // Ползунок утащили на конец записи: seeking, прыжок, seeked, ended.
    h.player.seek(6)
    h.fake.audio.seeking = true
    h.fake.fire('seeking')
    Object.assign(h.fake.audio, { seeking: false, currentTime: 6, paused: true, ended: true })
    h.fake.fire('seeked')
    h.fake.fire('ended')
    expect(h.snap().heard).toBe(false)
  })

  it('темп из настроек доезжает до audio и не теряется на следующем задании', () => {
    const h = build()
    h.session.setRate(0.75)
    expect(h.fake.audio.playbackRate).toBe(0.75)
    h.session.setImagesReady(true, h.snap().question.id)
    h.listenThrough()
    h.session.answer(h.snap().question.answer)
    h.session.next()
    expect(h.fake.audio.playbackRate).toBe(0.75)
  })
})
