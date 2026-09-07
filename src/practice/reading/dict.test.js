import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import { baseForms, displayWord, lookup } from './dict.js'

const DICT = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'practice', 'reading', 'dict.json'), 'utf8'),
)

describe('baseForms', () => {
  it('сводит школьные окончания к словарной форме', () => {
    expect(baseForms('babies')).toContain('baby')
    expect(baseForms('closes')).toContain('close')
    expect(baseForms('cats')).toContain('cat')
    expect(baseForms('flying')).toContain('fly')
    expect(baseForms('living')).toContain('live') // -ing с возвратом немой e
    expect(baseForms('walked')).toContain('walk')
    expect(baseForms("dog's")).toContain('dog')
  })

  it('исходная форма всегда первая — точное совпадение важнее догадки', () => {
    expect(baseForms('Bees')[0]).toBe('bees')
  })

  it('пустое слово форм не даёт', () => {
    expect(baseForms('—')).toEqual([])
  })
})

describe('displayWord', () => {
  it('снимает обрамляющую пунктуацию, оставляя регистр', () => {
    expect(displayWord('“Honey,”')).toBe('Honey')
    expect(displayWord("can't")).toBe("can't")
  })
})

describe('lookup', () => {
  const keyWords = [{ en: 'tomb', tr: '/tuːm/', ru: 'гробница', kz: 'қабір' }]

  it('ключевое слово текста бьёт словарь — у него есть транскрипция', () => {
    const hit = lookup('tomb!', DICT, keyWords)
    expect(hit).toMatchObject({ source: 'keyword', tr: '/tuːm/', ru: 'гробница' })
  })

  it('падает на словарь раздела с ru и kz', () => {
    const hit = lookup('Bees', DICT, keyWords)
    expect(hit.source).toBe('dict')
    expect(hit.en).toBe('Bees')
    expect(hit.ru).toBeTruthy()
    expect(hit.kz).toBeTruthy()
  })

  it('незнакомое слово отдаёт null — дальше решает вызывающий', () => {
    expect(lookup('quuxzzy', DICT, keyWords)).toBeNull()
  })

  it('без словаря работает по одним ключевым словам', () => {
    expect(lookup('tomb', null, keyWords).source).toBe('keyword')
    expect(lookup('bees', null, keyWords)).toBeNull()
  })
})

describe('словарь раздела', () => {
  it('покрывает частотные слова текстов', () => {
    // Не «каждое слово» — имена собственные и редкие термины ловит уже сетевой
    // переводчик. Но базовая лексика обязана быть офлайн, иначе тап по слову
    // без сети молчит.
    for (const w of ['honey', 'water', 'because', 'people', 'city', 'money']) {
      expect(DICT[w], w).toBeTruthy()
      expect(DICT[w]).toHaveLength(2)
    }
  })
})
