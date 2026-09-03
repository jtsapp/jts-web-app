// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { bindAudioClips, parseAudioClip } from './audioClip.js'

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
})
