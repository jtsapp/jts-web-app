import { dropPicks, isFree, tableAnswers } from '../../practice/workbook/engine.js'
import { loc, vocMeaning } from './loc.js'

// Ключ экрана воркбука одной строкой — эталон для помощника по сайту (data-assistant-expected, его читает снимок
// экрана lib/assistant/screenSnapshot.js). То же, что expectedAnswer(step) у курса, но по данным воркбука.
//
// Когда эталон отдаётся, решает экран, а не эта функция: только после «Показать ответ» и не на зачётном уроке. До
// этого воркбук нарочно не раскрывает ответ — неверный пункт остаётся живым, и его пересдают (ActShell.jsx), а Луна,
// знай она ключ, назвала бы его вместо подсказки.
//
// Номера — как у пунктов на экране (Qnum рисует n + 1), чтобы «3) went» читалось рядом с третьим пунктом.

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const numbered = (list) =>
  list
    .map((s, i) => [i + 1, clean(s)])
    .filter(([, s]) => s)
    .map(([n, s]) => `${n}) ${s}`)
    .join('; ')
const pairs = (list) => list.filter(([l, r]) => clean(l) && clean(r)).map(([l, r]) => `${clean(l)} → ${clean(r)}`).join('; ')

/**
 * @param act задание экрана (обёртки listen/read/video… судят вложенное act.task)
 * @param {{lang?: string, labels?: {true: string, false: string}}} opts — язык контента и подписи «Верно/Неверно»,
 *   те же, что рисует TfAct
 */
export function actAnswers(act, { lang = 'ru', labels = { true: 'True', false: 'False' } } = {}) {
  if (!act) return ''
  if (act.task) return actAnswers(act.task, { lang, labels })
  if (isFree(act)) return ''
  const items = act.items || []
  const L = (o) => loc(o, lang)
  switch (act.t) {
    case 'choose':
    case 'odd':
    case 'label':
    case 'respond':
    case 'quiz':
      return numbered(items.map((it) => L((it.o || [])[it.a])))
    case 'tf':
      return numbered(items.map((it) => (it.a ? labels.true : labels.false)))
    case 'bank':
    case 'type':
    case 'order':
    case 'trans':
    case 'ttrans':
    case 'wform':
      return numbered(items.map((it) => L(it.a)))
    case 'match':
      return pairs(items.map((it) => [L(it.l), L(it.r)]))
    case 'table':
      return numbered(tableAnswers(act))
    case 'chat':
      // Номер — по пропуску, а не по реплике: реплики без пропуска в счёт не идут.
      return numbered((act.lines || []).filter((ln) => String(ln.s).includes('___')).map((ln) => ln.a))
    case 'cloze':
      return numbered(act.gaps || [])
    case 'fix':
      return numbered(items.map((it) => `${clean((it.w || [])[it.bad])} → ${clean(it.fix)}`))
    case 'sort':
      return pairs(items.map((it) => [L(it.x), L((act.cols || [])[it.c])]))
    case 'seq':
      // Данные seq лежат в верном порядке — экран перемешивает их сам (seqOrder).
      return numbered(items.map((it) => L(it.s)))
    case 'epara':
      return pairs((act.bad || []).map((b) => [(act.words || [])[b.i], b.fix]))
    case 'drop':
      // Верный вариант списка всегда нулевой (dropLines).
      return numbered(dropPicks(act).map((p) => p.opts[0]))
    case 'memo':
      // Перевод — тот же, что на карточке (MemoAct): форма словаря угадывается по длине пары.
      return pairs((act.pairs || []).map((p) => [p[0], vocMeaning(p, lang, p.length === 3 ? 'def' : 'ru-kk')]))
    case 'chain':
      return numbered(items.map((it) => (it.steps || []).map((st) => clean(st.a)).join(' → ')))
    default:
      return ''
  }
}
