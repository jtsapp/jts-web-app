// Разделение локализации в контенте уроков A0/A1.
//
// Исходный курс хранит перевод слова одной строкой «русский · қазақша»
// («слушать · тыңдау»): в бумажной методичке это удобно, а на экране получается
// каша — при русском интерфейсе половина варианта ответа на казахском. Поэтому
// пару режем и показываем ту сторону, на которой сейчас интерфейс. В
// public/learning/a0.json таких строк 1760.
//
// Резать вслепую нельзя: в уроках A2/B1 та же точка-разделитель стоит между
// английскими образцами ответа («Are you free on…? · Would you like to…?»).
// Признак пары — латиницы в строке нет вообще и разделитель ровно один; на всём
// контенте A2/B1 (505 строк с «·») это правило не срабатывает ни разу.
const SEP = ' · '

function isPair(s) {
  if (typeof s !== 'string' || !s.includes(SEP)) return false
  if (/[A-Za-z]/.test(s)) return false
  return s.split(SEP).length === 2
}

// 'слушать · тыңдау' → 'слушать' (ru/en) или 'тыңдау' (kk).
// Английского перевода в контенте нет, поэтому для en остаётся русская сторона.
export function pickTr(s, lang) {
  if (!isPair(s)) return s
  const [ru, kk] = s.split(SEP)
  return (lang === 'kk' ? kk : ru).trim()
}

// Те же пары внутри готовой разметки правил и словарных блоков. Классы
// перечислены явно: замена по любому «·» в html задела бы разметку и англ. текст.
const TR_SPAN = /(<span class="(?:l-)?(?:kl-vocab__tr|t)"[^>]*>)([^<>]*)(<\/span>)/g

export function localizeHtml(html, lang) {
  if (!html) return html
  return String(html).replace(TR_SPAN, (m, open, text, close) => open + pickTr(text, lang) + close)
}
