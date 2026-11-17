// @vitest-environment jsdom
//
// Настройки устройства Literature World: язык раздела (по умолчанию — от языка приложения) и свои предложения к словам.
import { beforeEach, describe, expect, it } from 'vitest'
import { LITERATURE_DRAFTS_KEY, LITERATURE_LANG_KEY } from '../practiceKeys.js'
import { defaultLang, normalizeDrafts, normalizeLang, readDrafts, readLang, writeDrafts, writeLang } from './device.js'

beforeEach(() => localStorage.clear())

describe('язык раздела', () => {
  it('по умолчанию — от языка приложения: kk → kz, ru → ru, en → en; подсказки — казахские при казахском', () => {
    expect(defaultLang('kk')).toEqual({ lang: 'kz', sup: 'kz' })
    expect(defaultLang('ru')).toEqual({ lang: 'ru', sup: 'ru' })
    expect(defaultLang('en')).toEqual({ lang: 'en', sup: 'ru' })
    expect(readLang('kk')).toEqual({ lang: 'kz', sup: 'kz' })
  })

  it('выбор ученика хранится на устройстве и сильнее языка приложения; мусор — к умолчанию', () => {
    writeLang({ lang: 'en', sup: 'kz' }, 'ru')
    expect(JSON.parse(localStorage.getItem(LITERATURE_LANG_KEY))).toEqual({ lang: 'en', sup: 'kz' })
    expect(readLang('ru')).toEqual({ lang: 'en', sup: 'kz' })
    expect(normalizeLang({ lang: 'de', sup: 'fr' }, 'ru')).toEqual({ lang: 'ru', sup: 'ru' })
    localStorage.setItem(LITERATURE_LANG_KEY, '{oops')
    expect(readLang('en')).toEqual({ lang: 'en', sup: 'ru' })
  })
})

describe('свои предложения', () => {
  it('только id слов и непустой текст; пустой набор — ключа нет', () => {
    expect(normalizeDrafts({ solitude: 'I like it.', 'Bad Id': 'x', empty: '', n: 5 })).toEqual({ solitude: 'I like it.' })
    writeDrafts({ solitude: 'I like it.' })
    expect(readDrafts()).toEqual({ solitude: 'I like it.' })
    writeDrafts({})
    expect(localStorage.getItem(LITERATURE_DRAFTS_KEY)).toBeNull()
  })
})
