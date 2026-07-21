import { readFileSync } from 'node:fs'
const env = readFileSync('.env.vercel.tmp', 'utf8')
const kl = env.split(/\r?\n/).find((l) => l.startsWith('SONIOX_API_KEY='))
const key = kl.slice('SONIOX_API_KEY='.length).replace(/^"|"$/g, '').replace(/^﻿/, '').trim()
console.log('key len:', key.length)
const PROD = 'https://jts-web-app.vercel.app'
let r = await fetch(`${PROD}/api/tutor-tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tutor: 'luna', text: 'Hello, how are you doing today? I am learning English.', lang: 'en' }) })
console.log('tts:', r.status, r.headers.get('content-type'))
const audio = Buffer.from(await r.arrayBuffer())
console.log('audio bytes:', audio.length, 'header:', audio.toString('ascii', 0, 4))
const BASE = 'https://api.soniox.com', auth = { Authorization: `Bearer ${key}` }
const form = new FormData()
form.append('file', new Blob([audio], { type: 'audio/wav' }), 'a.wav')
r = await fetch(`${BASE}/v1/files`, { method: 'POST', headers: auth, body: form })
console.log('upload:', r.status)
const up = await r.json().catch(() => ({}))
console.log('file:', JSON.stringify(up).slice(0, 200))
if (!up?.id) process.exit(0)
r = await fetch(`${BASE}/v1/transcriptions`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'stt-async-v5', file_id: up.id, language_hints: ['en'] }) })
console.log('create:', r.status)
const cr = await r.json().catch(() => ({}))
console.log('create body:', JSON.stringify(cr).slice(0, 300))
if (cr?.id) {
  let st = {}
  for (let i = 0; i < 25; i++) { await new Promise((x) => setTimeout(x, 700)); r = await fetch(`${BASE}/v1/transcriptions/${cr.id}`, { headers: auth }); st = await r.json().catch(() => ({})); if (st.status === 'completed' || st.status === 'error') break }
  console.log('poll:', st.status, st.error_message || '')
  r = await fetch(`${BASE}/v1/transcriptions/${cr.id}/transcript`, { headers: auth })
  console.log('transcript:', r.status)
  const tr = await r.json().catch(() => ({}))
  console.log('transcript body:', JSON.stringify(tr).slice(0, 400))
  await fetch(`${BASE}/v1/files/${up.id}`, { method: 'DELETE', headers: auth }).catch(() => {})
  await fetch(`${BASE}/v1/transcriptions/${cr.id}`, { method: 'DELETE', headers: auth }).catch(() => {})
}
