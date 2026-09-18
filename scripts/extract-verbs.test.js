// Тесты экстрактора «Неправильных глаголов». Гоняются по настоящему прототипу
// (data/jtsverbs.html) — если ре-экспорт макета сдвинет структуру, красным
// станет здесь, а не пустым экраном в проде.

import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SRC, buildDict, checkData, checkWav, readPrototype, sliceEngine } from './extract-verbs.js'
import { COMPARE, FIXES, FORM_CARDS, HERO, PATTERN_CARDS, QUIZ } from '../src/practice/verbs/lesson.js'

const html = fs.readFileSync(DEFAULT_SRC, 'utf8')
const proto = readPrototype(html)

describe('срез прототипа', () => {
  it('находит движок и все константы данных', () => {
    const engine = sliceEngine(html)
    expect(engine).toContain('var VERBS')
    expect(engine).toContain('function scoreTargets(')
  })

  it('падает, если структура прототипа сдвинулась', () => {
    expect(() => sliceEngine(html.replace('var FIXES', 'var ERRATA'))).toThrow(/нет var FIXES/)
    expect(() => sliceEngine('<html><script>1</script></html>')).toThrow(/второй <script>/)
  })
})

describe('состав материала', () => {
  it('90 глаголов в восьми группах, по 60 предложений и исправлений, 210 записей', () => {
    expect(proto.VERBS).toHaveLength(90)
    expect(proto.GROUPS).toEqual(['same', 'iau', 'ought', 'v2v3', 'ewown', 'ooen', 'ioien', 'uniq'])
    expect(proto.SENTENCES).toHaveLength(60)
    expect(proto.FIXES).toHaveLength(60)
    expect(Object.keys(proto.AUDIO)).toHaveLength(210)
    for (const lang of ['en', 'ru', 'kk']) expect(proto.I18N[lang].title).toBeTruthy()
  })

  it('валидация проходит, и каждая запись — PCM 16 кГц не длиннее доли бита', () => {
    const meta = checkData(proto)
    for (const [key, m] of Object.entries(meta)) {
      expect(m.rate, key).toBe(16000)
      // 116 BPM — самый быстрый темп: доля 0.52 с, форма должна в неё влезать.
      expect(m.seconds, key).toBeLessThan(0.52)
    }
  })

  it('отказ на битом материале — с понятной причиной', () => {
    const broken = (patch) => ({ ...proto, ...patch })
    const noClip = { ...proto.AUDIO }
    delete noClip.went
    expect(() => checkData(broken({ AUDIO: noClip }))).toThrow(/go.*went/)
    expect(() =>
      checkData(broken({ VERBS: proto.VERBS.map((v, i) => (i ? v : { ...v, group: 'nope' })) })),
    ).toThrow(/неизвестная группа/)
    expect(() =>
      checkData(broken({ SENTENCES: proto.SENTENCES.map((s, i) => (i ? s : { ...s, text: 'no blank' })) })),
    ).toThrow(/не один пропуск/)
    expect(() => checkData(broken({ FIXES: proto.FIXES.map((s, i) => (i ? s : { ...s, text: 'no mark' })) }))).toThrow(
      /не одна ошибка/,
    )
  })

  it('WAV не того формата не проходит', () => {
    const good = Buffer.from(proto.AUDIO.go, 'base64')
    expect(checkWav('go', good).rate).toBe(16000)
    const stereo = Buffer.from(good)
    stereo.writeUInt16LE(2, 22) // каналов: 2
    expect(() => checkWav('go', stereo)).toThrow(/PCM 16 бит моно/)
    expect(() => checkWav('go', Buffer.from('not a wav at all'))).toThrow(/RIFF/)
  })
})

describe('словарь тапа', () => {
  const dict = buildDict(proto.VERBS, proto.extraWords)

  it('формы глаголов ведут к лемме, варианты через «/» — отдельными словами', () => {
    expect(dict.went).toMatchObject({ lemma: 'go' })
    expect(dict.were).toMatchObject({ lemma: 'be' })
    expect(dict.gotten).toMatchObject({ lemma: 'get' })
  })

  it('слова предложений — с ru и kk, глагольные формы они не перебивают', () => {
    expect(dict.yesterday).toMatchObject({ ru: 'вчера', kk: 'кеше' })
    // «read» есть и в extraWords-подобных словах, но глагол записан раньше.
    expect(dict.read.lemma).toBe('read')
    for (const [w, e] of Object.entries(dict)) {
      expect(w, w).toBe(w.toLowerCase())
      expect(e.ru || e.kk, w).toBeTruthy()
    }
  })
})

describe('английские примеры урока (lesson.js) — из прототипа', () => {
  // Блок английского урока: примеры ищем именно там, а не где угодно в файле.
  const start = html.indexOf('data-language="en"')
  const end = html.indexOf('data-language="ru"')
  const en = html.slice(start, end).replace(/<[^>]+>/g, '')

  it('каждая строка примеров есть в английском блоке исходника', () => {
    const strings = [
      HERO.join(''),
      ...COMPARE.irregular.map(([a, b, c]) => `${a} → ${b} → ${c}`),
      ...FORM_CARDS.flatMap((c) => [c.title, ...c.examples.map((e) => e.join('')), c.more.join('')]),
      ...PATTERN_CARDS.flatMap((p) => [p.chain, p.example]),
      ...FIXES.flatMap((f) => [f.wrong, f.right]),
      ...QUIZ.map((q) => q.text),
    ]
    const flat = en.replace(/\s+/g, ' ')
    for (const s of strings) expect(flat.replace(/\s+/g, ''), s).toContain(s.replace(/\s+/g, ''))
  })

  it('правильные варианты мини-теста совпадают с разметкой прототипа', () => {
    for (const q of QUIZ) {
      const at = html.indexOf(q.text, start)
      const block = html.slice(at, html.indexOf('</div>', html.indexOf('class="row', at)))
      expect(block, q.text).toContain(`data-answer="yes" data-rule`)
      const yes = block.match(/data-answer="yes"[^>]*>([^<]+)</)
      expect(yes && yes[1], q.text).toBe(q.answer)
      for (const c of q.choices) expect(block, q.text).toContain(`>${c}<`)
    }
  })
})
