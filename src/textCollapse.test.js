import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

/**
 * Текст не должен схлопываться в колонку по букве.
 *
 * Жалоба с прода (B1, «You'll never believe what happened», Warm-up): формулировка
 * задания отрисовалась вертикальной колонкой по одному символу в строке, середина
 * карточки — пустая, варианты внизу. Замер на стенде: грид-трек `1fr` получил
 * 13.6px, абзац — 14px × 1289px, карточка выросла до 1309px вместо 141px.
 *
 * Причина — свойство, а не раскладка. `overflow-wrap: anywhere` (и равный ему
 * legacy `word-break: break-word`) добавляет точки переноса, которые УЧИТЫВАЮТСЯ
 * в min-content ширине (CSS Text 4 §5.5). Замер min-content одной и той же фразы:
 * 92px при `break-word` против 11px при `anywhere`. Поэтому любой бокс, чья ширина
 * выводится из содержимого — грид-трек `1fr`/`minmax(0,·)`, флекс-ребёнок с
 * `min-width: 0`, — ужимался до символа, стоило соседу забрать ширину.
 *
 * `break-word` рвёт слишком длинное слово ровно так же и от выезда за край
 * защищает не хуже, но min-content не опускает. Поэтому на прозе его и держим.
 *
 * Тест сторожит НЕ конкретный случай, а свойство: новое `anywhere` на тексте
 * обязано быть осознанным и объявленным здесь.
 */

// fileURLToPath, а не .pathname: на Windows тот отдаёт '/C:/…', и join()
// склеивал его в 'C:\C:\…'.
const CSS_DIR = fileURLToPath(new URL('.', import.meta.url))
const COLLAPSING = /overflow-wrap:\s*anywhere|word-break:\s*(break-all|break-word)/

/**
 * Где перенос внутри слова — меньшее зло.
 *
 * Колонки сортировки не ужимаются ниже 160px (`.lw-sort__cols`), и длинному слову
 * деваться больше некуда: без `anywhere` «internationalisation» при крупном тексте
 * выезжает за колонку на 20px, а в последней его срезает `overflow: hidden`.
 * Схлопнуться колонка при этом не может — у трека есть пол.
 */
const ALLOWED = [
  '.lw-sort__col-body .lw-chip',
  '.lw-sort__bank .lw-chip',
  // Имя файла — неразрывный токен в ряду с nowrap-соседями; колонка ему не нужна.
  '.hw-file__name',
]

/**
 * Та же болезнь на поверхностях, которых эта правка не касалась.
 *
 * Их не чиню вслепую: каждое из этих мест надо открыть глазами и померить, а
 * поверхности разные — словарный тренажёр, редактор письма, чат. Список может
 * только уменьшаться: сторож падает и на новой строке, и на протухшей.
 */
const KNOWN = [
  'styles.css: .bubble',
  'styles.css: .sch-row__teacher',
  'styles.css: .vc .v-mem-open .v-mem',
  'vocab-catalog.css: .vp-modal .mhd b',
  'vocab-catalog.css: .vp-opt',
  'vocab-catalog.css: .vp-pair',
  'vocab-catalog.css: .vp-pcard__bub > span',
  'vocab-catalog.css: .vp-pcard__strip b',
  'vocab-catalog.css: .vp-pcard__tr',
  'vocab-catalog.css: .vp-reveal-ipa',
  'vocab-catalog.css: .vp-wcard .top b',
  'vocab-catalog.css: .vp-wordbox .w',
  'writing.css: .wr-editor',
  'writing.css: .wr-tpop__en',
]

function cssFiles() {
  return readdirSync(CSS_DIR)
    .filter((name) => name.endsWith('.css'))
    .map((name) => ({ name, text: readFileSync(join(CSS_DIR, name), 'utf8') }))
}

/** Правила файла парой «селектор → тело», без комментариев. */
function rules(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim().replace(/\s+/g, ' '),
    body,
  }))
}

describe('текст не схлопывается в колонку по букве', () => {
  /** Поверхность урока — там, где жалоба, и там, где всё проверено на стенде. */
  it('в уроке не осталось ни одного правила, режущего прозу по символам', () => {
    const lesson = cssFiles().filter((f) => f.name === 'lessonWorkspace.css')
    const offenders = []
    for (const { name, text } of lesson) {
      for (const rule of rules(text)) {
        if (!COLLAPSING.test(rule.body)) continue
        if (ALLOWED.some((sel) => rule.selector.includes(sel))) continue
        offenders.push(`${name}: ${rule.selector}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('прозу не режут по символам — только объявленные исключения', () => {
    const offenders = []
    for (const { name, text } of cssFiles()) {
      for (const rule of rules(text)) {
        if (!COLLAPSING.test(rule.body)) continue
        const key = `${name}: ${rule.selector}`
        const allowed = ALLOWED.some((sel) => rule.selector.includes(sel)) || KNOWN.includes(key)
        if (!allowed) offenders.push(key)
      }
    }
    expect(offenders, `Эти правила опускают min-content текста до одного символа, и любой
контейнер, чья ширина выводится из содержимого, схлопнется в колонку по букве.
Возьми \`overflow-wrap: break-word\` — он так же не даёт выехать за край.
Если перенос внутри слова здесь осознан, допиши селектор в ALLOWED и объясни почему:\n${offenders.join('\n')}`)
      .toEqual([])
  })

  // Legacy-свойство равно `anywhere` по влиянию на min-content и перебивает
  // соседний `overflow-wrap`: оставленное рядом, оно молча съело бы правку.
  it('legacy word-break: break-word не остался рядом с переносом', () => {
    const offenders = []
    for (const { name, text } of cssFiles()) {
      for (const rule of rules(text)) {
        if (/word-break:\s*break-word/.test(rule.body) && /overflow-wrap:\s*break-word/.test(rule.body)) {
          offenders.push(`${name}: ${rule.selector}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('починенное вычеркнуто из списка известных', () => {
    const live = new Set()
    for (const { name, text } of cssFiles()) {
      for (const rule of rules(text)) {
        if (COLLAPSING.test(rule.body)) live.add(`${name}: ${rule.selector}`)
      }
    }
    const stale = KNOWN.filter((key) => !live.has(key))
    expect(stale, `Этих правил больше нет — убери строки из KNOWN, чтобы список не врал:\n${stale.join('\n')}`)
      .toEqual([])
  })
})
