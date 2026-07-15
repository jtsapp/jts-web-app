'use client'

// Browser audio helpers for the IELTS sections: mic capture → 16 kHz mono WAV
// (what Azure Pronunciation Assessment takes), and playback of the Listening
// scripts.
//
// Ported from the relevant slice of felix lib/voice.ts. The server-voice
// (Gemini TTS) leg of speakListeningAudio is dropped — this app has no Gemini
// key — so the fallback chain is ElevenLabs → browser SpeechSynthesis.

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? window.webkitAudioContext ?? null
}

function getOfflineAudioContextCtor() {
  if (typeof window === 'undefined') return null
  return window.OfflineAudioContext ?? window.webkitOfflineAudioContext ?? null
}

export function isMediaRecordingSupported() {
  if (typeof window === 'undefined') return false
  const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia
  const hasRecorder = typeof MediaRecorder !== 'undefined'
  return hasGetUserMedia && hasRecorder && getAudioContextCtor() !== null
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // format = PCM
  view.setUint16(22, 1, true) // channels = mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate (mono * 16-bit)
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return new Blob([view], { type: 'audio/wav' })
}

/** Decode any recorded blob and re-render it to a 16 kHz mono WAV blob. */
export async function blobToWav16kMono(blob) {
  const Ctx = getAudioContextCtor()
  const OfflineCtx = getOfflineAudioContextCtor()
  if (!Ctx || !OfflineCtx) throw new Error('Web Audio API unavailable')

  const arrayBuf = await blob.arrayBuffer()
  const decodeCtx = new Ctx()
  let decoded
  try {
    // slice(0) hands decodeAudioData its own copy (some browsers detach it).
    decoded = await decodeCtx.decodeAudioData(arrayBuf.slice(0))
  } finally {
    void decodeCtx.close()
  }

  const targetRate = 16000
  const frames = Math.max(1, Math.ceil(decoded.duration * targetRate))
  const offline = new OfflineCtx(1, frames, targetRate)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start(0)
  const rendered = await offline.startRendering()
  return encodeWav(rendered.getChannelData(0), targetRate)
}

// ---------------------------------------------------------------------------
// Listening playback
// ---------------------------------------------------------------------------

let currentAudio = null
let currentObjectUrl = null

function stopServerAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause()
    } catch {
      /* ignore */
    }
    currentAudio = null
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

/** Stop any in-flight listening audio (leaving the screen, submitting). */
export function cancelSpeech() {
  if (typeof window === 'undefined') return
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  stopServerAudio()
}

// Browser SpeechSynthesis fallback, so a learner without ElevenLabs configured
// still hears the clip.
function speakBrowser(text, opts) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.95
    if (opts.volume != null) u.volume = Math.max(0, Math.min(1, opts.volume))
    u.onend = () => opts.onEnd?.()
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}

/**
 * Play a Listening clip via the low-latency ElevenLabs route
 * (/api/listening-audio), falling back to browser TTS so the learner always
 * hears the prompt. Returns which path played, or "none" if nothing did.
 *
 * @returns {Promise<"eleven" | "fallback" | "none">}
 */
export async function speakListeningAudio(text, opts = {}) {
  if (!text.trim()) return 'none'
  try {
    stopServerAudio()
    const res = await fetch('/api/listening-audio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      const blob = await res.blob()
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        if (opts.volume != null) audio.volume = Math.max(0, Math.min(1, opts.volume))
        currentAudio = audio
        currentObjectUrl = url
        audio.onended = () => {
          stopServerAudio()
          opts.onEnd?.()
        }
        audio.onerror = () => stopServerAudio()
        await audio.play()
        return 'eleven'
      }
    } else {
      console.warn(`[listening-audio] ElevenLabs failed (HTTP ${res.status}); falling back.`)
    }
  } catch (e) {
    console.warn('[listening-audio] ElevenLabs error; falling back:', e)
    stopServerAudio()
  }
  return speakBrowser(text, opts) ? 'fallback' : 'none'
}
