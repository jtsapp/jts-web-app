// Что задание грамматики считало верным — для помощника по сайту (data-assistant-expected на итоговой плашке
// неверного ответа, см. Activity в ActivityPlayer.jsx). Снимок экрана помощника читает только видимый текст, а верный
// вариант после ошибки виден не везде: «найди ошибку» подсвечивает слово без исправления, «разложи по группам»
// красит фишки без подписи, куда им было надо, у True/False цвет лежит на нажатом чипе. Помощнику оставалось угадывать
// эталон — ровно так он однажды назвал верным «like» для «I ___ rain.» в курсе.
//
// Строка — одна на задание и в том же виде, что у курса (src/learning/CourseStepPlayer.jsx, expectedAnswer): пары
// «что → куда» через «; ». Данные — те, что видит плеер, то есть после normalizeActivities.
import { uiStr } from './strings.js'

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

// Текст заданий хранит разметку (<b>, <span class="hl">) и местами &nbsp; — помощнику нужен голый текст.
const plain = (html) =>
  String(html ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, k) => ENTITIES[k])
    .replace(/\s+/g, ' ')
    .trim()

// Ключ ответа «ничего не ставить» (артикль, by-фраза — 5 заданий A2/C1): пустая строка в снимке читалась бы как
// «эталона нет». Плеер такой пропуск принимает и прочерком.
const NOTHING = '— (ничего не ставить)'

const TIMELINE_ZONES = ['past', 'now', 'future']

export function expectedOf(a, lang = 'ru') {
  if (!a) return ''
  switch (a.type) {
    case 'mc':
      return plain(a.options?.[a.answer])
    case 'gap':
    case 'transform':
      return plain(a.answer) || NOTHING
    // Ключ диктанта — нормализованная строчными строка («they are turkish…»); звучит и пишется предложение из text.
    case 'dictation':
      return plain(a.text) || plain(a.answer)
    case 'order':
      return plain(Array.isArray(a.answer) ? a.answer.join(' ') : a.answer)
    // «ошибочное слово → исправление»: исправление бывает и пояснением в скобках («(delete the)»), его отдаём как есть.
    case 'error': {
      const wrong = plain(a.words?.[a.wrong])
      const fix = plain(a.correct)
      return wrong && fix ? `${wrong} → ${fix}` : wrong || fix
    }
    case 'categorize':
      return (a.items || []).map((it) => `${plain(it.t)} → ${plain(a.buckets?.[it.b])}`).join('; ')
    case 'matching':
      return (a.pairs || []).map((p) => `${plain(p.l)} → ${plain(p.r)}`).join('; ')
    // Подписи чипов в плеере английские на любом языке интерфейса — так и пишем.
    case 'truefalse':
      return (a.items || []).map((it) => `${plain(it.s)} → ${it.ok ? 'True' : 'False'}`).join('; ')
    // Зона — подписью кнопки на языке интерфейса («Сейчас»), а не ключом данных «now». Неизвестный ключ uiStr вернул
    // бы именем строки («tl_usually»), поэтому подпись берём только у трёх зон шкалы.
    case 'timeline':
      return TIMELINE_ZONES.includes(a.answer) ? uiStr(lang, `tl_${a.answer}`) : plain(a.answer)
    // Диалог проходится только верными репликами, но ошибки по пути ставят итогу «неверно»: эталон — верная реплика
    // каждого шага, рядом с репликой собеседника, на которую она отвечает.
    case 'dialogue':
      return (a.steps || [])
        .map((st) => {
          const ok = (st.options || []).find((o) => o.ok)
          return ok ? `${plain(st.npc)} → ${plain(ok.t)}` : ''
        })
        .filter(Boolean)
        .join('; ')
    case 'speaking':
      return plain(a.target)
    default:
      return ''
  }
}
