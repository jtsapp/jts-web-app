import { describe, it, expect } from 'vitest'
import { WAKE_GRAMMAR, WAKE_SETS, matchWake, wakeSet, wakeStartSec } from './matchWake.js'

describe('позывной', () => {
  it('обе фразы — да, в любом регистре, с ё/ә и знаками', () => {
    expect(matchWake('привет луна')).toBe(true)
    expect(matchWake('Привет, Луна!')).toBe(true)
    expect(matchWake('салем луна')).toBe(true)
    expect(matchWake('Сәлем, Луна')).toBe(true)
  })

  it('с [unk] до или после — да: ученик сказал рядом что-то ещё', () => {
    expect(matchWake('[unk] привет луна')).toBe(true)
    expect(matchWake('привет луна [unk]')).toBe(true)
  })

  it('просто «Луна» — да: отдельно, повтором и первым словом обращения', () => {
    expect(matchWake('луна')).toBe(true)
    expect(matchWake('Луна!')).toBe(true)
    expect(matchWake('  луна  ')).toBe(true)
    expect(matchWake('луна луна')).toBe(true)
    // «Луна, открой…» — остальное ложится на ловушки, имя первым.
    expect(matchWake('луна от урок')).toBe(true)
    expect(matchWake('луна [unk]')).toBe(true)
    // шум перед именем — не слово
    expect(matchWake('[unk] луна')).toBe(true)
  })

  // Распознанное замера 19.10.2026 (/wake-lab, голоса Soniox и Айзере): имя посреди
  // фразы — это речь о помощнике, а не к нему.
  it('имя посреди реплики — нет', () => {
    expect(matchWake('по лунная луна сегодня')).toBe(false)
    expect(matchWake('по смотри на луну')).toBe(false)
    expect(matchWake('она сказать что привет')).toBe(false)
    expect(matchWake('одна задание')).toBe(false)
    expect(matchWake('[unk] привет [unk]')).toBe(false)
  })

  it('«привет» без имени, разорванная фраза, склейка, пусто — нет', () => {
    expect(matchWake('привет')).toBe(false)
    expect(matchWake('салем')).toBe(false)
    expect(matchWake('привет [unk] луна')).toBe(false)
    expect(matchWake('приветлуна')).toBe(false)
    expect(matchWake('[unk]')).toBe(false)
    expect(matchWake('')).toBe(false)
    expect(matchWake(null)).toBe(false)
  })

  it('грамматика распознавателя — две фразы, имя, слова-ловушки и [unk]', () => {
    expect(WAKE_GRAMMAR.slice(0, 3)).toEqual(['привет луна', 'салем луна', 'луна'])
    expect(WAKE_GRAMMAR.at(-1)).toBe('[unk]')
    // Созвучные имени — среди ловушек: «Одна задача осталась» без них приходило как «луна».
    expect(WAKE_GRAMMAR).toEqual(expect.arrayContaining(['одна', 'она', 'луну']))
  })

  it('ловушки не задевают позывной: в них нет ни имени, ни слов привета', () => {
    for (const set of Object.values(WAKE_SETS)) {
      const fillers = set.grammar.slice(3, -1)
      expect(fillers.length).toBeGreaterThan(50)
      for (const w of [set.name, 'привет', 'салем', 'сәлем']) expect(fillers).not.toContain(w)
      expect(new Set(fillers).size).toBe(fillers.length)
    }
  })
})

// Айзере — помощник при казахском интерфейсе: своя модель (казахская), свои фразы.
describe('позывной Айзере', () => {
  const aiz = wakeSet('aizere')

  it('слушает казахской моделью, грамматика — сәлем/привет + имя', () => {
    expect(aiz.model).toBe('kk')
    expect(aiz.grammar.slice(0, 3)).toEqual(['сәлем айзере', 'привет айзере', 'айзере'])
    expect(aiz.grammar).toEqual(expect.arrayContaining(['зере', 'айгерім', 'қалай']))
  })

  it('«Сәлем, Айзере», «Привет, Айзере», отдельное «Айзере» — да', () => {
    expect(matchWake('сәлем айзере', aiz)).toBe(true)
    expect(matchWake('Сәлем, Айзере!', aiz)).toBe(true)
    expect(matchWake('привет айзере', aiz)).toBe(true)
    expect(matchWake('[unk] сәлем айзере', aiz)).toBe(true)
    expect(matchWake('айзере', aiz)).toBe(true)
    expect(matchWake('Айзере!', aiz)).toBe(true)
  })

  it('«Айзере, маған көмектесші» — да: имя первым словом', () => {
    expect(matchWake('айзере мұғалім күн мектеп', aiz)).toBe(true)
  })

  // Распознанное замера 19.10.2026: имя посреди фразы, созвучные имена, ловушки.
  it('имя посреди реплики и чужое имя — нет; Луну Айзере не слышит', () => {
    expect(matchWake('мен кеш айзере мен сөз кім', aiz)).toBe(false)
    expect(matchWake('әйгерім сәлем', aiz)).toBe(false)
    expect(matchWake('сәлем қалай', aiz)).toBe(false)
    expect(matchWake('зере қайда жеті', aiz)).toBe(false)
    expect(matchWake('мүмкін ауыл өте жақсы', aiz)).toBe(false)
    expect(matchWake('сәлем', aiz)).toBe(false)
    expect(matchWake('луна', aiz)).toBe(false)
    expect(matchWake('привет луна', aiz)).toBe(false)
  })

  it('чужой id — набор Луны', () => {
    expect(wakeSet('dexter')).toBe(WAKE_SETS.luna)
    expect(matchWake('айзере')).toBe(false)
  })
})

// Команды голосом (21.10.2026): «Луна, дальше» — тот же позывной, команда слышна целиком.
describe('команды в грамматике', () => {
  it('«имя + команда» и сами команды; [unk] последним, без повторов', () => {
    for (const set of [WAKE_SETS.luna, WAKE_SETS.aizere]) {
      expect(set.grammar.at(-1)).toBe('[unk]')
      expect(new Set(set.grammar).size).toBe(set.grammar.length)
    }
    expect(WAKE_SETS.luna.grammar).toContain('луна дальше')
    expect(WAKE_SETS.luna.grammar).toContain('дальше')
    expect(WAKE_SETS.aizere.grammar).toContain('айзере келесі')
  })
  it('«луна дальше» — позывной; «дальше» без имени — нет', () => {
    expect(matchWake('луна дальше')).toBe(true)
    expect(matchWake('дальше')).toBe(false)
  })
  it('wakeStartSec — начало имени или приветствия перед ним', () => {
    expect(wakeStartSec([{ word: 'луна', start: 1.2 }, { word: 'дальше', start: 1.6 }])).toBe(1.2)
    expect(wakeStartSec([{ word: 'привет', start: 0.4 }, { word: 'луна', start: 0.9 }])).toBe(0.4)
    expect(wakeStartSec([{ word: 'дальше', start: 0.4 }])).toBe(null)
    expect(wakeStartSec([{ word: 'сәлем', start: 2 }, { word: 'айзере', start: 2.5 }], WAKE_SETS.aizere)).toBe(2)
  })
})
