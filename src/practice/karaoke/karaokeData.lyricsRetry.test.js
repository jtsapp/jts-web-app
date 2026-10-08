// @vitest-environment jsdom
// Ревью «Практики» 08.10.2026, #61: сбой загрузки разметки трека запоминался
// как «разметки нет» до перезагрузки вкладки — песня больше не открывалась,
// в сеть никто не ходил. Каталог караоке этого уже не делает (9ea3cbda),
// разметка трека — делала.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getKaraokeTrack = vi.fn()
vi.mock('../../api.js', () => ({
  getKaraokeTracks: vi.fn(),
  getKaraokeTrack: (...a) => getKaraokeTrack(...a),
}))

async function fresh() {
  vi.resetModules()
  return (await import('./karaokeData.js')).loadLyrics
}

const TRACK = { id: 7, slug: 'yesterday', title: 'Yesterday' }
const FULL = {
  id: 7,
  slug: 'yesterday',
  title: 'Yesterday',
  audioUrl: 'https://files/yesterday.mp3',
  lyrics: { lines: [{ id: 1, start: 0, end: 2, text: 'Yesterday' }, { id: 2, start: 2, end: 4, text: 'All my troubles' }] },
}

beforeEach(() => {
  getKaraokeTrack.mockReset()
})

describe('loadLyrics — сбой не запоминается', () => {
  it('после сбоя сети следующее открытие трека снова спрашивает сервер', async () => {
    getKaraokeTrack.mockRejectedValueOnce(new Error('сеть')).mockResolvedValueOnce(FULL)
    const loadLyrics = await fresh()
    expect(await loadLyrics(TRACK, 'T')).toBeNull()
    const doc = await loadLyrics(TRACK, 'T')
    expect(doc?.lines).toHaveLength(2)
    expect(getKaraokeTrack).toHaveBeenCalledTimes(2)
  })

  it('«разметки нет» — ответ сервера, он запоминается', async () => {
    getKaraokeTrack.mockResolvedValue({ id: 7, slug: 'yesterday', title: 'Yesterday', audioUrl: 'https://files/yesterday.mp3' })
    const loadLyrics = await fresh()
    expect(await loadLyrics(TRACK, 'T')).toBeNull()
    expect(await loadLyrics(TRACK, 'T')).toBeNull()
    expect(getKaraokeTrack).toHaveBeenCalledTimes(1)
  })
})
