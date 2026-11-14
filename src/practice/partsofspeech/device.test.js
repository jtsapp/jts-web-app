// @vitest-environment jsdom
//
// Настройки Parts of Speech World на устройстве: язык перевода, вид (звук, подписи) и черновики письма.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PARTSOFSPEECH_DRAFTS_KEY, PARTSOFSPEECH_LANG_KEY, PARTSOFSPEECH_PREFS_KEY } from '../practiceKeys.js'
import { clearLocalPractice } from '../practiceSync.js'
import { normalizeDrafts, normalizePrefs, readDrafts, readLang, readPrefs, writeDrafts, writeLang, writePrefs } from './device.js'

beforeEach(() => localStorage.clear())

describe('устройство Parts of Speech World', () => {
  it('язык: en по умолчанию и на мусор; выбранный kk / ru хранится, en — снимает ключ', () => {
    expect(readLang()).toBe('en')
    expect(writeLang('kk')).toBe('kk')
    expect(localStorage.getItem(PARTSOFSPEECH_LANG_KEY)).toBe('kk')
    expect(readLang()).toBe('kk')
    localStorage.setItem(PARTSOFSPEECH_LANG_KEY, 'kz')
    expect(readLang()).toBe('en')
    writeLang('ru')
    writeLang('en')
    expect(localStorage.getItem(PARTSOFSPEECH_LANG_KEY)).toBeNull()
  })

  it('вид: звук включён, подписи выключены; умолчание не хранится', () => {
    expect(readPrefs()).toEqual({ sound: true, labels: false })
    expect(normalizePrefs({ sound: 0, labels: 'yes' })).toEqual({ sound: true, labels: false })
    expect(writePrefs({ sound: false, labels: true })).toEqual({ sound: false, labels: true })
    expect(readPrefs()).toEqual({ sound: false, labels: true })
    writePrefs({ sound: true, labels: false })
    expect(localStorage.getItem(PARTSOFSPEECH_PREFS_KEY)).toBeNull()
  })

  it('черновики: только строки под id упражнений, пустые не хранятся, длина ограничена', () => {
    expect(normalizeDrafts({ u10a3: 'text', u11a3: '', '<x>': 'y', u13a3: 5, u15a3: 'z'.repeat(30000) })).toEqual({ u10a3: 'text', u15a3: 'z'.repeat(20000) })
    expect(writeDrafts({ u10a3: 'My text' })).toEqual({ u10a3: 'My text' })
    expect(readDrafts()).toEqual({ u10a3: 'My text' })
    writeDrafts({})
    expect(localStorage.getItem(PARTSOFSPEECH_DRAFTS_KEY)).toBeNull()
  })

  it('забитое хранилище не роняет запись — экран держит копию в памяти', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(writePrefs({ sound: false, labels: false })).toEqual({ sound: false, labels: false })
    expect(writeDrafts({ u10a3: 'x' })).toEqual({ u10a3: 'x' })
    expect(writeLang('ru')).toBe('ru')
    vi.restoreAllMocks()
  })

  it('выход чистит язык, вид и черновики вместе с прогрессом', () => {
    writeLang('ru')
    writePrefs({ sound: false, labels: true })
    writeDrafts({ u10a3: 'My text' })
    clearLocalPractice()
    expect(readLang()).toBe('en')
    expect(readPrefs()).toEqual({ sound: true, labels: false })
    expect(readDrafts()).toEqual({})
  })
})
