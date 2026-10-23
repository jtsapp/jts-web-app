import { describe, it, expect, vi } from 'vitest'
import { listeningAudioUrl, listeningStaticUrl, loadListeningLevel, safeMarkup } from './listeningContent.js'

describe('listeningContent', () => {
  it('запись: полный URL с бэкенда — как есть, имя файла — из статики уровня', () => {
    expect(listeningAudioUrl('a1', 'https://files-dev.justtostudy.kz/development/practice/listening/ab.mp3'))
      .toBe('https://files-dev.justtostudy.kz/development/practice/listening/ab.mp3')
    expect(listeningAudioUrl('b2', '01-10__20p08-30p54.mp3')).toBe('/practice/listening/audio/b2/01-10__20p08-30p54.mp3')
  })

  it('уровень грузится с бэкенда раздела listening, запасной путь — файл уровня', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      json: async () => (String(url).includes('/practice-content/') ? [] : [{ id: 'a1_001' }]),
    }))
    const res = await loadListeningLevel('a1', { fetchImpl, base: 'https://api.test' })
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual([
      'https://api.test/practice-content/listening/a1',
      listeningStaticUrl('a1'),
    ])
    expect(res.source).toBe('static')
  })

  it('разбор: <b> и <i> остаются, остальное — текстом', () => {
    expect(safeMarkup('Li is a <b>student</b> in <I>Shanghai</I>.')).toBe('Li is a <b>student</b> in <i>Shanghai</i>.')
    expect(safeMarkup('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;')
    expect(safeMarkup('<b class="x">a</b>')).toBe('&lt;b class="x"&gt;a</b>')
    expect(safeMarkup('Tom & Jerry')).toBe('Tom &amp; Jerry')
    expect(safeMarkup(null)).toBe('')
  })
})
