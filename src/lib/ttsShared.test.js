import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { normalizeTts, ttsUrl, TTS_VOICES, VOICE, TTS_MAX_TEXT } from './ttsShared.js'

// Один текст и одни параметры обязаны давать один адрес — на этом держатся
// HTTP-кэш браузера и дисковый кэш роута. Разъехались — платим Soniox за тот
// же звук повторно.
describe('ttsShared', () => {
  it('пробелы и края текста не делают новый адрес', () => {
    expect(ttsUrl({ text: '  Good   morning ' })).toBe(ttsUrl({ text: 'Good morning' }))
  })

  it('темп округляется до 0.05 и держится в границах провайдера', () => {
    expect(normalizeTts({ text: 'a', speed: 0.93 }).speed).toBe(0.95)
    expect(normalizeTts({ text: 'a', speed: 0.6 }).speed).toBe(0.7)
    expect(normalizeTts({ text: 'a', speed: 2 }).speed).toBe(1.3)
    expect(normalizeTts({ text: 'a', speed: 'nope' }).speed).toBe(1)
  })

  it('казахский интерфейса «kz» — это «kk» у Soniox', () => {
    expect(normalizeTts({ text: 'сәлем', lang: 'kz' }).lang).toBe('kk')
    expect(normalizeTts({ text: 'a', lang: 'xx' }).lang).toBe('en')
  })

  it('пустой текст — озвучивать нечего', () => {
    expect(normalizeTts({ text: '   ' })).toBeNull()
    expect(ttsUrl({ text: '' })).toBeNull()
  })

  it('длинный текст режется до потолка роута', () => {
    expect(normalizeTts({ text: 'a'.repeat(TTS_MAX_TEXT + 50) }).text).toHaveLength(TTS_MAX_TEXT)
  })

  it('адрес: постоянный порядок параметров и экранированный текст', () => {
    expect(ttsUrl({ text: 'Tom & Jerry?', voice: VOICE.gb, speed: 0.9 })).toBe(
      '/api/tts?v=Freya&l=en&s=0.9&t=Tom%20%26%20Jerry%3F',
    )
  })

  it('голос не из списка — дефолтный', () => {
    expect(normalizeTts({ text: 'a', voice: 'Nobody' }).voice).toBe(VOICE.us)
  })

  // Движок Сказок собирает адрес сам (он самостоятельный скрипт без импортов)
  // и кастует персонажей строками. Имя вне белого списка роут отобьёт 400, и
  // персонаж замолчит — ловим это здесь, а не у студента.
  it('все голоса состава Сказок есть в белом списке роута', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/practice/fairytale/engine.js'), 'utf8')
    const cast = src.slice(src.indexOf('const SONIOX_CAST='), src.indexOf('let sonioxAssign='))
    const names = [...cast.matchAll(/"([A-Z][a-z]+)"/g)].map((m) => m[1])
    expect(names.length).toBeGreaterThan(10)
    for (const n of names) expect(TTS_VOICES.has(n), n).toBe(true)
    // Фолбэк-голоса в sonioxUrl тоже из списка.
    expect(TTS_VOICES.has('Oliver') && TTS_VOICES.has('Freya')).toBe(true)
  })

  it('движок Сказок строит адрес в том же каноническом виде', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/practice/fairytale/engine.js'), 'utf8')
    expect(src).toContain('return "/api/tts?v="+v+"&l="+l+"&s="+s+"&t="+encodeURIComponent(clean);')
  })
})
