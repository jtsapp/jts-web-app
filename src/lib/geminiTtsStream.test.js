import http2 from 'node:http2'
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'

// Сообщения gRPC собраны вручную — сверяем байты с эталоном, который снял
// protobufjs с cloud_tts.proto (googleapis, v1; поля скопированы один в один).
// Сам поток гоняем через локальный HTTP/2-сервер вместо Google: он разбирает
// запрос тем же кодом и отвечает так, как отвечает Cloud TTS (кадры с
// audio_content, grpc-status в трейлерах или сразу в заголовках).
let server
let base
let handler = () => {}

vi.mock('./tutorVoice.js', () => ({
  GEMINI_TTS: { model: 'gemini-2.5-flash-tts', host: 'unused' },
  googleAuth: vi.fn(async () => ({ token: 'at', project: 'proj' })),
}))
const { googleAuth } = await import('./tutorVoice.js')
const { GrpcError, audioOf, configMessage, createDeframer, frame, inputMessage, isPermanent, streamGemini } =
  await import('./geminiTtsStream.js')

// Эталоны protobufjs (scratchpad сессии 15.10.2026: mini.proto из cloud_tts.proto).
const CONFIG_HEX =
  '0a2e0a240a05656e2d55531205416f656465321467656d696e692d322e352d666c6173682d7474732206080710c0bb01'
const INPUT_HEX = '121c0a1ad09fd180d0b8d0b2d0b5d1822120d0af20d09bd183d0bdd0b02e'
// audio_content = 01020304 и timepoints { mark_name: 'm', time_seconds: 0.5 }.
const RESPONSE_HEX = '0a0401020304120c19000000000000e03f22016d'

// audio_content (поле 1) — как его кодирует Cloud TTS.
const audioMsg = (bytes) => Buffer.concat([Buffer.from([0x0a, bytes.length]), Buffer.from(bytes)])

beforeAll(async () => {
  server = http2.createServer()
  server.on('stream', (stream, headers) => {
    const parts = []
    const deframe = createDeframer((m) => parts.push(Buffer.from(m)))
    stream.on('data', deframe)
    stream.on('end', () => handler(stream, headers, parts))
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => server.close())
afterEach(() => {
  handler = () => {}
})

const ok = (stream, chunks) => {
  stream.respond({ ':status': 200, 'content-type': 'application/grpc' }, { waitForTrailers: true })
  stream.on('wantTrailers', () => stream.sendTrailers({ 'grpc-status': '0' }))
  for (const c of chunks) stream.write(frame(audioMsg(c)))
  stream.end()
}

describe('сообщения StreamingSynthesize', () => {
  it('конфиг и текст — байт в байт как protobufjs', () => {
    expect(configMessage({ voice: 'Aoede', languageCode: 'en-US', model: 'gemini-2.5-flash-tts' }).toString('hex')).toBe(
      CONFIG_HEX,
    )
    expect(inputMessage('Привет! Я Луна.').toString('hex')).toBe(INPUT_HEX)
  })

  it('из ответа берётся audio_content, прочие поля пропускаются', () => {
    expect([...audioOf(Buffer.from(RESPONSE_HEX, 'hex'))]).toEqual([1, 2, 3, 4])
    expect(audioOf(Buffer.alloc(0))).toHaveLength(0)
  })

  it('кадры gRPC собираются из кусков любого размера', () => {
    const got = []
    const d = createDeframer((m) => got.push(audioOf(m).length))
    const big = Buffer.alloc(300, 9)
    const msg = Buffer.concat([Buffer.from([0x0a, 0xac, 0x02]), big]) // длина 300 — двухбайтовый varint
    const bytes = Buffer.concat([frame(msg), frame(msg), frame(audioMsg([1]))])
    for (let i = 0; i < bytes.length; i += 7) d(bytes.subarray(i, i + 7))
    expect(got).toEqual([300, 300, 1])
  })
})

describe('streamGemini', () => {
  it('шлёт конфиг, текст и half-close; звук отдаёт кусками по мере прихода', async () => {
    let seen
    handler = (stream, headers, parts) => {
      seen = { headers, parts }
      ok(stream, [
        [1, 2],
        [3, 4, 5],
      ])
    }
    const got = []
    await streamGemini('Привет! Я Луна.', { voice: 'Aoede', languageCode: 'en-US', host: base, onAudio: (b) => got.push([...b]) })
    expect(got).toEqual([
      [1, 2],
      [3, 4, 5],
    ])
    expect(seen.headers[':path']).toBe('/google.cloud.texttospeech.v1.TextToSpeech/StreamingSynthesize')
    expect(seen.headers['content-type']).toBe('application/grpc')
    expect(seen.headers.authorization).toBe('Bearer at')
    expect(seen.headers['x-goog-user-project']).toBe('proj')
    expect(seen.parts.map((p) => p.toString('hex'))).toEqual([CONFIG_HEX, INPUT_HEX])
  })

  it('отказ сразу в заголовках (trailers-only) — GrpcError с кодом и текстом', async () => {
    handler = (stream) =>
      stream.respond(
        { ':status': 200, 'content-type': 'application/grpc', 'grpc-status': '12', 'grpc-message': 'not%20here' },
        { endStream: true },
      )
    const err = await streamGemini('x', { voice: 'Aoede', languageCode: 'en-US', host: base, onAudio: () => {} }).catch((e) => e)
    expect(err).toBeInstanceOf(GrpcError)
    expect(err.code).toBe(12)
    expect(err.message).toContain('not here')
    expect(isPermanent(err)).toBe(true)
  })

  it('отказ в трейлерах после звука — ошибка, звук до неё отдан', async () => {
    handler = (stream) => {
      stream.respond({ ':status': 200, 'content-type': 'application/grpc' }, { waitForTrailers: true })
      stream.on('wantTrailers', () => stream.sendTrailers({ 'grpc-status': '14', 'grpc-message': 'later' }))
      stream.write(frame(audioMsg([7])))
      stream.end()
    }
    const got = []
    const err = await streamGemini('x', { voice: 'Aoede', languageCode: 'en-US', host: base, onAudio: (b) => got.push(...b) }).catch(
      (e) => e,
    )
    expect(got).toEqual([7])
    expect(err.code).toBe(14)
    expect(isPermanent(err)).toBe(false)
  })

  it('signal обрывает зависший поток', async () => {
    handler = (stream) => stream.respond({ ':status': 200, 'content-type': 'application/grpc' })
    const ctrl = new AbortController()
    const pending = streamGemini('x', { voice: 'Aoede', languageCode: 'en-US', host: base, signal: ctrl.signal, onAudio: () => {} })
    setTimeout(() => ctrl.abort(), 30)
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('без ключа Google — ошибка no_credentials, в сеть не идёт', async () => {
    googleAuth.mockResolvedValueOnce(null)
    await expect(streamGemini('x', { voice: 'Aoede', languageCode: 'en-US', host: base, onAudio: () => {} })).rejects.toMatchObject({
      code: 'no_credentials',
    })
  })
})
