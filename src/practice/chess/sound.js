// src/practice/chess/sound.js
'use client'

// Звуки шахмат: стук фигуры, взятие, шах, рокировка, превращение, конец партии, мало времени.
// Записи — набор «sfx» Lichess (AGPL-3.0+, автор Enigmahack): файлы лежат отдельно в public/chess/sound
// вместе с лицензией и адресом исходников, в бандл не попадают. Звуки chess.com — их собственность,
// «стандартный» набор Lichess несвободный, поэтому взят этот. Первая версия звучала синтезом — владелец
// попросил настоящие звуки (15.11.2026); синтез остался запасным, пока запись не загрузилась, и для
// сигналов, которых в наборе нет (превращение, недопустимый ход).
//
// Контекст один на вкладку, будится в обработчике нажатия (iPhone отпускает звук только так) и усыпляется
// при уходе с экрана: разбуженный, он гнал бы пустой аудиопоток по всему приложению.
import { CHESS_PREFS_KEY } from '../practiceKeys.js'

const MASTER = 0.6
let ctx = null
let master = null
let noiseBuf = null
let enabled = null

// Сигнал → файл набора. Записи разбираются в AudioBuffer того же контекста: <audio> на каждый ход
// запаздывал бы на телефоне и рвал звук при быстрых ходах.
export const CHESS_CLIPS = { move: 'move', capture: 'capture', check: 'check', win: 'victory', lose: 'defeat', draw: 'draw', lowtime: 'lowtime', start: 'genericnotify' }
const buffers = {}
let loadStarted = false

function loadClips() {
  if (loadStarted || !ctx || typeof fetch !== 'function') return
  loadStarted = true
  for (const [name, file] of Object.entries(CHESS_CLIPS)) {
    fetch(`/chess/sound/${file}.mp3`)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('sound ' + res.status))))
      .then((data) => ctx.decodeAudioData(data))
      .then((buf) => { buffers[name] = buf })
      .catch(() => { /* записи нет — этот сигнал останется синтезом */ })
  }
}

// Запись сигнала; false — её ещё нет, вызывающий играет синтез.
function clip(name, at = 0) {
  const buf = buffers[name]
  if (!buf) return false
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(master)
  src.start(ctx.currentTime + at)
  return true
}

function readPrefs() {
  try { return JSON.parse(window.localStorage.getItem(CHESS_PREFS_KEY) || '{}') || {} } catch { return {} }
}

export function isChessSoundOn() {
  // По умолчанию включён: выключенный звук, о котором никто не знает, всё равно что его нет.
  if (enabled === null) enabled = typeof window === 'undefined' ? true : readPrefs().sound !== false
  return enabled
}

export function setChessSoundOn(on) {
  enabled = !!on
  try { window.localStorage.setItem(CHESS_PREFS_KEY, JSON.stringify({ ...readPrefs(), sound: enabled })) } catch { /* приватное окно */ }
  if (enabled) wakeChessSound()
}

export function wakeChessSound() {
  try {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AC) return null
    if (!ctx) {
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = MASTER
      master.connect(ctx.destination)
    }
    loadClips()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

/** Загрузить записи заранее, при входе в раздел: контекст создаётся спящим, жест для разбора файлов не нужен. */
export function preloadChessSound() {
  try {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AC || ctx) { loadClips(); return }
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = MASTER
    master.connect(ctx.destination)
    loadClips()
  } catch { /* без звука раздел работает */ }
}

export function sleepChessSound() {
  if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {})
}

function noise() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

// Стук дерева: короткий шум через фильтр плюс низкий удар.
function knock(at, peak, cutoff) {
  const t = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = noise()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = cutoff
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(peak, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
  src.connect(filter).connect(gain).connect(master)
  src.start(t)
  src.stop(t + 0.08)
  tone(170, at, 0.07, peak * 0.5, 'sine')
}

function tone(freq, at, dur, peak, type = 'triangle') {
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = freq
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

const melody = (notes, step, dur, peak) => notes.forEach((f, i) => tone(f, i * step, dur, peak))

const CUES = {
  move: () => clip('move') || knock(0, 0.5, 1800),
  capture: () => clip('capture') || (knock(0, 0.8, 2600), knock(0.05, 0.45, 1300)),
  // Рокировка — два стука: король и ладья.
  castle: () => (clip('move') && clip('move', 0.12)) || (knock(0, 0.5, 1800), knock(0.1, 0.5, 1800)),
  check: () => clip('check') || (knock(0, 0.5, 1800), tone(880, 0.03, 0.14, 0.2)),
  promote: () => { if (!clip('move')) knock(0, 0.5, 1800); melody([523, 659, 784], 0.07, 0.16, 0.2) },
  win: () => clip('win') || melody([523, 659, 784, 1047], 0.12, 0.3, 0.25),
  lose: () => clip('lose') || melody([392, 330, 262], 0.16, 0.36, 0.22),
  draw: () => clip('draw') || melody([440, 440], 0.2, 0.26, 0.2),
  lowtime: () => clip('lowtime') || (tone(1000, 0, 0.08, 0.18, 'square'), tone(1000, 0.16, 0.08, 0.18, 'square')),
  // Начало партии: только записью — синтезного сигнала у него не было.
  start: () => clip('start'),
  illegal: () => tone(140, 0, 0.09, 0.12, 'sine'),
}

export function playChessCue(name) {
  if (!isChessSoundOn() || !CUES[name]) return
  if (!wakeChessSound() || ctx.state !== 'running') return
  try { CUES[name]() } catch { /* звук — не причина ронять партию */ }
}
