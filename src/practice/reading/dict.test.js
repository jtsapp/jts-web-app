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

describe('lookup: догадка об основе не подменяет слово', () => {
  // Ревью 08.10.2026: формы перебирались «короткая основа раньше верной», и
  // тап по used/uses/using показывал us «нас», times — «Тим (имя)», notes —
  // not «не», а as — артикль «a» (78 раз на текстах A1–C1).
  it.each([
    ['used', 'use'],
    ['uses', 'use'],
    ['using', 'use'],
    ['times', 'time'],
    ['timing', 'time'],
    ['ones', 'one'],
    ['notes', 'note'],
    ['noted', 'note'],
    ['caring', 'care'],
    ['cared', 'care'],
    ['cares', 'care'],
    ['Bees', 'bee'],
    ['hides', 'hide'],
    ['hiding', 'hide'],
    ['shining', 'shine'],
  ])('%s → %s', (word, base) => {
    expect(lookup(word, DICT, []).ru).toBe(DICT[base][0])
  })

  it('у -s/-es/-ed/-er основа короче трёх букв не берётся: as — не «a», toes — не «to»', () => {
    expect(lookup('as', DICT, [])).toBeNull()
    expect(lookup('toes', DICT, [])).toBeNull()
  })

  it('-es срезается только после шипящих и o: runes — не run', () => {
    expect(lookup('runes', DICT, [])).toBeNull()
    expect(lookup('boxes', DICT, []).ru).toBe(DICT.box[0])
    expect(lookup('dishes', DICT, []).ru).toBe(DICT.dish[0])
    expect(lookup('heroes', DICT, []).ru).toBe(DICT.hero[0])
  })

  it("короткие глаголы с -ing и местоимения с 's по-прежнему находятся", () => {
    expect(lookup('being', DICT, []).ru).toBe(DICT.be[0])
    expect(lookup('doing', DICT, []).ru).toBe(DICT.do[0])
    expect(lookup("it's", DICT, []).ru).toBe(DICT.it[0])
  })

  it('удвоенная согласная снимается последней: planning → plan, winner → win, hugged → hug', () => {
    expect(lookup('planning', DICT, []).ru).toBe(DICT.plan[0])
    expect(lookup('winner', DICT, []).ru).toBe(DICT.win[0])
    expect(lookup('hugged', DICT, []).ru).toBe(DICT.hug[0])
  })

  it('слова, где догадка по основе врёт, уходят к сетевому переводчику', () => {
    // Прогон всех слов текстов A1–C1: news — не new «новый», Peter the Great —
    // не pet, willing — не will «(будущее время)», marks — не «Марк».
    const traps = ['news', 'goods', 'sheer', 'Peter', 'shower', 'drawer', 'willing', 'forester', 'counter', 'owner', 'marks', 'marker', 'missed', 'lays']
    for (const w of traps) expect(lookup(w, DICT, []), w).toBeNull()
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
