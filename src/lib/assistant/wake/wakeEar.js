'use client'

// «Ухо» позывного Луны: Vosk (vosk-browser, WASM в Web Worker) слушает микрофон
// и ждёт «Привет, Луна» / «Сәлем, Луна». Звук никуда не уходит — распознаёт само
// устройство (решение 16.10.2026: слать звук на сервер — платить за каждую
// открытую вкладку и держать чужой микрофон в комнате ученика).
//
// vosk-browser грузится динамическим import() только у тех, кто включил позывной:
// 5.8 МБ с WASM внутри в общий бандл не идут. Модель он сам кэширует в IndexedDB по
// адресу — второй заход её не качает.
//
// Модель живёт до dispose(), микрофон — от start() до stop(): «ухо» отдаёт его,
// когда он нужен разделу (micArbiter.js). prepare() — то же, что start(), но без
// слушания: скачать модель и спросить разрешение заранее, в момент, когда ученик
// включает позывной, а не посреди урока.
//
// AudioContext без жеста браузер держит спящим (Chrome — до первого нажатия на
// странице, iPhone — до нажатия, разбудившего именно этот контекст): тогда
// состояние 'asleep', и будит его resume() — его зовут из обработчика нажатия.

import { withOwnMic } from './micArbiter.js'
import { WAKE_GRAMMAR, matchWake } from './matchWake.js'

// 4096 кадров ≈ 85 мс при 48 кГц: так кормит распознаватель пример vosk-browser.
const FRAME = 4096
const AUDIO = { audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }

async function loadVoskModel(url) {
  const mod = await import('vosk-browser')
  const createModel = mod.createModel || mod.default?.createModel
  // Воркер vosk-browser живёт по blob-адресу: относительный путь модели он разрешил
  // бы не от страницы — отдаём абсолютный.
  return createModel(new URL(url, window.location.href).href)
}

const micError = (err) => (err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'denied' : 'mic')

/**
 * @param {{ modelUrl: string, onWake: () => void,
 *   onState?: (state: 'idle'|'loading'|'asleep'|'listening'|'error', error?: 'model'|'denied'|'mic') => void,
 *   onResult?: (text: string) => void, loadModel?: (url: string) => Promise<any>,
 *   getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>, createContext?: () => AudioContext }} opts
 */
export function createWakeEar({
  modelUrl,
  onWake,
  onState = () => {},
  onResult = () => {},
  loadModel = loadVoskModel,
  getUserMedia = (c) => navigator.mediaDevices.getUserMedia(c),
  createContext = () => new (window.AudioContext || window.webkitAudioContext)(),
}) {
  let state = 'idle'
  let model = null
  let modelPromise = null
  let ctx = null
  let run = null // { stream, source, node, rec }
  let starting = false
  // Поколение: stop() посреди загрузки или запроса микрофона отменяет начатый start.
  let gen = 0

  const set = (next, error) => {
    state = next
    onState(next, error)
  }
  const live = () => (ctx?.state === 'running' ? 'listening' : 'asleep')

  async function ensureModel() {
    if (model) return model
    modelPromise ??= loadModel(modelUrl).catch((err) => {
      modelPromise = null
      throw err
    })
    model = await modelPromise
    return model
  }

  function teardown() {
    if (!run) return
    const { stream, source, node, rec } = run
    run = null
    node.onaudioprocess = null
    try {
      source.disconnect()
      node.disconnect()
    } catch {
      /* уже отключены */
    }
    rec.remove()
    for (const t of stream.getTracks()) t.stop()
  }

  async function start() {
    if (run || starting) return
    starting = true
    const my = ++gen
    try {
      if (!model) {
        set('loading')
        try {
          await ensureModel()
        } catch {
          if (my === gen) set('error', 'model')
          return
        }
        if (my !== gen) return
      }
      let stream
      try {
        stream = await withOwnMic(() => getUserMedia(AUDIO))
      } catch (err) {
        if (my === gen) set('error', micError(err))
        return
      }
      if (my !== gen) {
        for (const t of stream.getTracks()) t.stop()
        return
      }
      ctx ??= createContext()
      ctx.onstatechange = () => {
        if (run) set(live())
      }
      const rec = new model.KaldiRecognizer(ctx.sampleRate, JSON.stringify(WAKE_GRAMMAR))
      rec.on('result', (msg) => {
        const text = msg?.result?.text || ''
        onResult(text)
        if (run?.rec === rec && matchWake(text)) onWake()
      })
      const source = ctx.createMediaStreamSource(stream)
      // ScriptProcessor, а не AudioWorklet: acceptWaveform vosk-browser берёт
      // AudioBuffer, и он есть в старом Safari.
      const node = ctx.createScriptProcessor(FRAME, 1, 1)
      node.onaudioprocess = (e) => {
        try {
          rec.acceptWaveform(e.inputBuffer)
        } catch {
          /* кадр потерян — следующий дойдёт */
        }
      }
      source.connect(node)
      // Без выхода в destination ScriptProcessor в Chrome не вызывается; пишет он тишину.
      node.connect(ctx.destination)
      run = { stream, source, node, rec }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      set(live())
    } finally {
      starting = false
    }
  }

  async function prepare() {
    if (run || starting) return
    starting = true
    const my = ++gen
    try {
      set('loading')
      try {
        await ensureModel()
      } catch {
        if (my === gen) set('error', 'model')
        return
      }
      if (my !== gen) return
      try {
        const probe = await withOwnMic(() => getUserMedia(AUDIO))
        for (const t of probe.getTracks()) t.stop()
      } catch (err) {
        if (my === gen) set('error', micError(err))
        return
      }
      if (my === gen) set('idle')
    } finally {
      starting = false
    }
  }

  function stop() {
    gen += 1
    teardown()
    // Спящий контекст не гонит аудиопоток между заходами; будит его следующий start.
    if (ctx?.state === 'running') ctx.suspend().catch(() => {})
    if (state !== 'idle' && state !== 'error') set('idle')
  }

  // Из обработчика нажатия: iPhone будит только контекст, разбуженный жестом.
  function resume() {
    try {
      ctx ??= createContext()
      ctx.resume()?.catch?.(() => {})
    } catch {
      /* нет AudioContext — start сообщит ошибку микрофона */
    }
  }

  function dispose() {
    stop()
    ctx?.close?.().catch(() => {})
    ctx = null
    model?.terminate?.()
    model = null
    modelPromise = null
  }

  return {
    start,
    prepare,
    stop,
    resume,
    dispose,
    get state() {
      return state
    },
  }
}
