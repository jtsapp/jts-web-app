// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'

import { DEFAULT_VIEW, FONT_SIZES, readView, stepFont, viewVars, writeView } from './viewSettings.js'

describe('viewSettings', () => {
  beforeEach(() => localStorage.clear())

  it('без сохранённого отдаёт дефолты макета', () => {
    expect(readView()).toEqual(DEFAULT_VIEW)
  })

  it('переживает перезагрузку', () => {
    writeView({ fs: 24, lh: 2, width: 'narrow', dys: true })
    expect(readView()).toEqual({ fs: 24, lh: 2, width: 'narrow', dys: true })
  })

  it('мусор из хранилища чинится дефолтом, а не ломает читалку', () => {
    localStorage.setItem('jts_reading_view', JSON.stringify({ fs: 999, lh: 'x', width: 'huge', dys: 1 }))
    expect(readView()).toEqual({ ...DEFAULT_VIEW, dys: true })
    localStorage.setItem('jts_reading_view', 'not json')
    expect(readView()).toEqual(DEFAULT_VIEW)
  })

  it('stepFont ходит по шкале и упирается в края', () => {
    expect(stepFont(20, 1)).toBe(24)
    expect(stepFont(20, -1)).toBe(16)
    expect(stepFont(FONT_SIZES[0], -1)).toBe(FONT_SIZES[0])
    expect(stepFont(FONT_SIZES[FONT_SIZES.length - 1], 1)).toBe(FONT_SIZES[FONT_SIZES.length - 1])
  })

  it('неизвестный размер приводится к обычному, а не ломает шаг', () => {
    expect(stepFont(999, 1)).toBe(24)
  })

  it('viewVars отдаёт CSS-переменные читалки', () => {
    expect(viewVars({ fs: 24, lh: 1.5, width: 'narrow', dys: false })).toEqual({
      '--rd-fs': '24px',
      '--rd-scale': '1.2',
      '--rd-lh': '1.5',
      '--rd-measure': '48ch',
      '--rd-track': '0',
      '--rd-wspace': '0',
    })
  })

  it('множитель кегля тянет весь раздел, а не только абзацы текста', () => {
    // A+/A− в прототипе двигали размер на body — задания, слова и кнопки росли
    // вместе с текстом. У нас это делает --rd-scale.
    expect(viewVars({ ...DEFAULT_VIEW })['--rd-scale']).toBe('1')
    expect(viewVars({ ...DEFAULT_VIEW, fs: 16 })['--rd-scale']).toBe('0.8')
    expect(viewVars({ ...DEFAULT_VIEW, fs: 30 })['--rd-scale']).toBe('1.5')
  })

  it('режим дислексии — это разрядка букв и слов', () => {
    const v = viewVars({ ...DEFAULT_VIEW, dys: true })
    expect(v['--rd-track']).toBe('.06em')
    expect(v['--rd-wspace']).toBe('.14em')
  })
})
