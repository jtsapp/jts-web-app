// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { bindAudioClips, dropAudioClipEnd, isMultiSpeakerListenText, parseAudioClip } from './audioClip.js'

/**
 * Жалоба: «там несколько дорожек, хоть каждый начинается с правильного момента,
 * оно может продолжаться до конца». Границы отрывка конвертер пишет прямо в
 * `src` (`…mp3#t=3.77,19.74`), но конец медиа-фрагмента браузеры не соблюдают —
 * перематывают на начало и играют файл до конца.
 */
describe('parseAudioClip', () => {
  it('читает начало и конец', () => {
    expect(parseAudioClip('Track_2.4.mp3#t=3.77,19.74')).toEqual({ start: 3.77, end: 19.74 })
  })

  it('одно только начало — останавливать нечего', () => {
    expect(parseAudioClip('Track_2.1.mp3#t=3.77')).toEqual({ start: 3.77, end: null })
  })

  it('без фрагмента дорожка играет целиком', () => {
    expect(parseAudioClip('Track_2.1.mp3')).toBeNull()
    expect(parseAudioClip(null)).toBeNull()
  })

  // Разметка курса бывает сломанной: играем целиком, но хотя бы с начала.
  it('конец раньше начала — конца нет', () => {
    expect(parseAudioClip('t.mp3#t=20,5')).toEqual({ start: 20, end: null })
  })
})

function audioIn(root, src) {
  const audio = document.createElement('audio')
  // jsdom не реализует currentSrc/воспроизведение — подменяем ровно то, что
  // читает и меняет утилита.
  Object.defineProperty(audio, 'currentSrc', { value: src, configurable: true })
  audio.pause = vi.fn()
  root.appendChild(audio)
  return audio
}

describe('bindAudioClips', () => {
  it('на конце отрывка останавливает и возвращает к его началу', () => {
    const root = document.createElement('div')
    const unbind = bindAudioClips(root)
    const audio = audioIn(root, 'x.mp3#t=10,20')

    audio.currentTime = 20.2
    audio.dispatchEvent(new Event('timeupdate'))

    expect(audio.pause).toHaveBeenCalled()
    expect(audio.currentTime).toBe(10)
    unbind()
  })

  it('внутри отрывка не трогает воспроизведение', () => {
    const root = document.createElement('div')
    bindAudioClips(root)
    const audio = audioIn(root, 'x.mp3#t=10,20')

    audio.currentTime = 15
    audio.dispatchEvent(new Event('timeupdate'))

    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(15)
  })

  // Дорожка без конца — обычный файл, играет как играл.
  it('дорожку без конца не останавливает', () => {
    const root = document.createElement('div')
    bindAudioClips(root)
    const audio = audioIn(root, 'x.mp3#t=10')

    audio.currentTime = 999
    audio.dispatchEvent(new Event('timeupdate'))

    expect(audio.pause).not.toHaveBeenCalled()
  })

  it('нажали «играть» вне отрывка — переходим к его началу', () => {
    const root = document.createElement('div')
    bindAudioClips(root)
    const audio = audioIn(root, 'x.mp3#t=10,20')

    audio.currentTime = 0
    audio.dispatchEvent(new Event('play'))

    expect(audio.currentTime).toBe(10)
  })

  it('отписка снимает слушателей', () => {
    const root = document.createElement('div')
    const unbind = bindAudioClips(root)
    const audio = audioIn(root, 'x.mp3#t=10,20')
    unbind()

    audio.currentTime = 25
    audio.dispatchEvent(new Event('timeupdate'))

    expect(audio.pause).not.toHaveBeenCalled()
  })

  it('верхний плеер «three speakers» не обрывает запись на первом', () => {
    const root = document.createElement('div')
    bindAudioClips(root)
    const card = document.createElement('div')
    card.className = 'lw-practice'
    card.appendChild(document.createTextNode('Listen to the three speakers. What does each one miss from home?'))
    const audio = audioIn(card, 'Track_2.6.mp3#t=3.5,28.2')
    root.appendChild(card)

    audio.currentTime = 28.5
    audio.dispatchEvent(new Event('timeupdate'))

    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(28.5)
  })

  it('кнопки отрывков 2 и 3 на той же карточке по-прежнему режут своих', () => {
    const root = document.createElement('div')
    bindAudioClips(root)
    const card = document.createElement('div')
    card.className = 'lw-practice'
    card.appendChild(document.createTextNode('Listen to three speakers.'))
    audioIn(card, 'Track_2.6.mp3#t=3.5,90')
    const clip2 = audioIn(card, 'Track_2.6.mp3#t=30,45')
    root.appendChild(card)

    clip2.currentTime = 45.1
    clip2.dispatchEvent(new Event('timeupdate'))

    expect(clip2.pause).toHaveBeenCalledTimes(1)
    expect(clip2.currentTime).toBe(30)
  })
})

describe('dropAudioClipEnd', () => {
  it('снимает конец, начало оставляет', () => {
    expect(dropAudioClipEnd('Track_2.6.mp3#t=3.5,28.2')).toBe('Track_2.6.mp3#t=3.5')
  })

  it('без конца не трогает', () => {
    expect(dropAudioClipEnd('Track_2.6.mp3#t=3.5')).toBe('Track_2.6.mp3#t=3.5')
    expect(dropAudioClipEnd('Track_2.6.mp3')).toBe('Track_2.6.mp3')
  })
})

describe('isMultiSpeakerListenText', () => {
  it('узнаёт задание про трёх спикеров', () => {
    expect(isMultiSpeakerListenText('Listen to the three speakers. What does each one miss from home?')).toBe(true)
  })

  it('обычное аудирование — нет', () => {
    expect(isMultiSpeakerListenText('Listen to the sentence. Which linker do you hear?')).toBe(false)
  })
})
