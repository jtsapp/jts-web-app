// @vitest-environment jsdom
// Ревью «Практики» 08.10.2026, #49: одна неудачная запись красила кнопку
// «нет файла» до конца сцены, даже когда следующие слова звучали.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useWordsVoice from './useWordsVoice.js'

afterEach(() => vi.unstubAllGlobals())

function stubAudio(results) {
  class FakeAudio {
    constructor() {
      this.src = ''
      this.onended = null
    }
    play() {
      const r = results.shift()
      return r === 'ok' ? Promise.resolve() : Promise.reject(Object.assign(new Error('nope'), { name: 'NotSupportedError' }))
    }
    pause() {}
  }
  vi.stubGlobal('Audio', FakeAudio)
}

describe('useWordsVoice — отметка сбоя', () => {
  it('следующая удачная запись снимает отметку сбоя', async () => {
    stubAudio(['fail', 'ok'])
    const { result } = renderHook(() => useWordsVoice())
    await act(async () => {
      result.current.voice.play({ id: 'cow' })
    })
    expect(result.current.failedAt).toBeGreaterThan(0)
    await act(async () => {
      result.current.voice.play({ id: 'pig' })
    })
    expect(result.current.failedAt).toBe(0)
  })

  it('сбой после удачной записи по-прежнему отмечается', async () => {
    stubAudio(['ok', 'fail'])
    const { result } = renderHook(() => useWordsVoice())
    await act(async () => {
      result.current.voice.play({ id: 'cow' })
    })
    expect(result.current.failedAt).toBe(0)
    await act(async () => {
      result.current.voice.play({ id: 'pig' })
    })
    expect(result.current.failedAt).toBeGreaterThan(0)
  })
})
