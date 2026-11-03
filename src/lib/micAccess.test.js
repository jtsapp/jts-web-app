// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { micEnvironment, micErrorKind, micPlatform, openMic } from './micAccess.js'

const err = (name) => Object.assign(new Error(name), { name })

describe('micErrorKind — причина по ошибке getUserMedia', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'nodevice'],
    ['NotReadableError', 'busy'],
    ['AbortError', 'busy'],
    ['TypeError', 'failed'],
  ])('%s → %s', (name, kind) => {
    expect(micErrorKind(err(name))).toBe(kind)
  })
  it('без ошибки — failed', () => expect(micErrorKind(undefined)).toBe('failed'))
})

describe('openMic', () => {
  it('микрофон не открылся с обработкой звука — второй раз без неё', async () => {
    const stream = { id: 's' }
    const md = { getUserMedia: vi.fn().mockRejectedValueOnce(err('NotReadableError')).mockResolvedValueOnce(stream) }
    await expect(openMic(undefined, md)).resolves.toBe(stream)
    expect(md.getUserMedia).toHaveBeenLastCalledWith({ audio: true })
  })
  it('запрет повтором не обходится', async () => {
    const md = { getUserMedia: vi.fn().mockRejectedValue(err('NotAllowedError')) }
    await expect(openMic(undefined, md)).rejects.toMatchObject({ name: 'NotAllowedError' })
    expect(md.getUserMedia).toHaveBeenCalledTimes(1)
  })
})

describe('micEnvironment — без запроса разрешения', () => {
  let prev
  beforeEach(() => {
    prev = { md: navigator.mediaDevices, perm: navigator.permissions }
    window.MediaRecorder = function MediaRecorder() {}
    window.AudioContext = function AudioContext() {}
  })
  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: prev.md })
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: prev.perm })
    delete window.MediaRecorder
    delete window.AudioContext
  })
  const setup = ({ state, inputs }) => {
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => ({ state }) } })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(),
        enumerateDevices: async () => Array.from({ length: inputs }, () => ({ kind: 'audioinput' })),
      },
    })
  }

  it('запрещено в браузере — denied, getUserMedia не зовём', async () => {
    setup({ state: 'denied', inputs: 1 })
    await expect(micEnvironment(window)).resolves.toMatchObject({ issue: 'denied', permission: 'denied' })
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
  })
  it('ни одного микрофона — nodevice', async () => {
    setup({ state: 'prompt', inputs: 0 })
    await expect(micEnvironment(window)).resolves.toMatchObject({ issue: 'nodevice', devices: 0 })
  })
  it('разрешено и микрофон есть — проблем нет', async () => {
    setup({ state: 'granted', inputs: 2 })
    await expect(micEnvironment(window)).resolves.toMatchObject({ issue: null, permission: 'granted', devices: 2 })
  })
  it('браузер не умеет записывать — unsupported', async () => {
    setup({ state: 'granted', inputs: 1 })
    delete window.MediaRecorder
    await expect(micEnvironment(window)).resolves.toMatchObject({ issue: 'unsupported' })
  })
})

describe('micPlatform', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)', 'ios'],
    ['Mozilla/5.0 (Linux; Android 14)', 'android'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'windows'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)', 'mac'],
  ])('%s', (ua, platform) => expect(micPlatform(ua)).toBe(platform))
})
