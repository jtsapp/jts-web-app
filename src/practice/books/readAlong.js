// Чистая логика читалки «Книжек»: полоса прогресса в режиме чтения и субтитры
// аудиокниги. Вынесена из BookDetail.jsx, чтобы её можно было накрыть тестом
// без DOM — экран только меряет прямоугольники и время и рисует результат.

function clamp01(v) {
  return Math.min(Math.max(v, 0), 1)
}

// ── Полоса прогресса чтения (кадр 4302:16980) ──────────────────────────────

/**
 * Доля главы, которую читатель уже пролистал: 0 — начало главы ещё не ушло за
 * верх экрана, 1 — конец текста показался над полосой.
 *
 * Считаем по главе, а не по книге: прогресс книги («N/M глав») уже стоит на
 * обзоре, а за одну главу книжная полоса сдвинулась бы на 1/M — на экране она
 * стояла бы на месте. «21%» в макете — заглушка: в том же кадре заливка
 * занимает 29 px из 276 (10%), а текст ещё не тронут прокруткой.
 *
 * Все числа — в координатах окна (getBoundingClientRect): top — верх главы,
 * bottom — конец её текста (без кнопки «следующая глава»), viewBottom — нижняя
 * граница видимого текста, то есть верх самой полосы. atPageEnd — страница
 * докручена до упора: у последней главы под текстом только нижнее поле, конец
 * текста физически не поднимается над полосой, и без этого флага полоса
 * навсегда застряла бы на 99%.
 */
export function chapterProgress({ top, bottom, viewTop = 0, viewBottom, atPageEnd = false }) {
  const height = bottom - top
  const view = viewBottom - viewTop
  if (!(height > 0) || !(view > 0)) return 0
  if (bottom <= viewBottom || atPageEnd) return 1
  if (height <= view) return 0
  return clamp01((viewTop - top) / (height - view))
}

// ── Субтитры аудиокниги (кадры 4295:16276, 4295:16324) ─────────────────────
//
// ЭТО ПРИБЛИЖЕНИЕ, А НЕ СИНХРОНИЗАЦИЯ. У трека в админке есть только текст
// главы (AudioTrack.chapterText — бэкенд прямо подписывает его «player
// subtitles»), а того, в какую секунду звучит какое предложение, нет нигде: ни
// в базе, ни в ответе /mobile/audio-lessons/{id}. Поэтому место в тексте
// берём пропорцией: доля проигранного времени (currentTime / duration)
// переносится на долю длины текста в символах, и подсвечивается предложение,
// на которое она пришлась. Чтец держит темп неровно (паузы, название главы
// вслух, заставка), так что к середине главы подсветка может разойтись с
// голосом на предложение-другое. Поэтому дробнее предложения не подсвечиваем:
// пословная заливка изображала бы точность, которой нет. Настоящая
// синхронизация — таймкоды предложений или слов от бэкенда (как lyrics у
// караоке).

// «Mr.» и компания — не конец предложения: иначе «Mr. Otis bought…» распалось
// бы на субтитр «Mr.» и остаток.
const ABBR = /(?:^|[\s("“'‘])(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|Mt|Prof|Capt|Col|Gen|Rev)\.$/
// Конец предложения: знаки, закрывающие кавычки/скобки и пробел или конец
// строки. Без требования пробела «3.5» и «e.g.x» резались бы посередине.
const END = /[.!?…]+["”’')\]]*(?=\s|$)/g

function sentencesOf(line) {
  const out = []
  let from = 0
  END.lastIndex = 0
  let m
  while ((m = END.exec(line))) {
    const to = m.index + m[0].length
    const piece = line.slice(from, to)
    if (ABBR.test(piece)) continue
    if (piece.trim()) out.push(piece.trim())
    from = to
  }
  const rest = line.slice(from).trim()
  if (rest) out.push(rest)
  return out
}

/**
 * Текст главы → предложения с позициями в символах и абзацы (строки текста
 * админки). Пустые строки абзацев не дают: в макете субтитры идут сплошной
 * колонкой, без интервалов.
 */
export function splitSubtitles(text) {
  const sentences = []
  const paras = []
  let pos = 0
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line) continue
    const ids = []
    for (const s of sentencesOf(line)) {
      ids.push(sentences.length)
      sentences.push({ text: s, start: pos, end: pos + s.length })
      pos += s.length
    }
    if (ids.length) paras.push(ids)
  }
  return { sentences, paras, total: pos }
}

/**
 * Какое предложение звучит сейчас — по пропорции времени (см. шапку раздела).
 * index −1 — ещё ничего не прозвучало (или длительность неизвестна: поток без
 * метаданных); frac — доля внутри предложения, нужна только прокрутке, чтобы
 * длинное предложение не обрезалось окном.
 */
export function subtitleAt(subs, cur, dur) {
  const list = subs?.sentences || []
  if (!list.length || !(dur > 0) || !Number.isFinite(dur) || !(cur > 0)) return { index: -1, frac: 0 }
  const at = Math.min(cur / dur, 1) * subs.total
  let lo = 0
  let hi = list.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (list[mid].end <= at) lo = mid + 1
    else hi = mid
  }
  const s = list[lo]
  const frac = s.end > s.start ? clamp01((at - s.start) / (s.end - s.start)) : 1
  return { index: lo, frac }
}

// Названия глав сверяем с буквами любого алфавита: книги админки бывают и с
// русскими названиями, а normTitle читалки оставляет только латиницу.
function sameTitle(a, b) {
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
  const x = norm(a)
  return !!x && x === norm(b)
}

/**
 * Текст субтитров для трека аудиоплеера. Пустая строка — карточку не рисуем.
 *
 * 1) Текст того же трека с detail-эндпоинта бэкенда — ради этого поле и
 *    заведено. Трек ищем по id, потом по trackIndex; по позиции — только если
 *    число треков совпало (список и detail — одна книга, порядок общий).
 * 2) Глава статической библиотеки сайта (data/books) — это другой источник
 *    (оригинальный текст, а озвучка в админке может быть адаптацией), поэтому
 *    берём её, только если совпали и число глав, и название главы.
 * Закрытая для демо глава приходит без текста — и субтитров у неё нет.
 */
export function subtitleTextFor(track, index, { apiTracks, staticChapters, trackCount } = {}) {
  const api = Array.isArray(apiTracks) ? apiTracks : []
  const hit =
    (track?.id != null && api.find((t) => t?.id != null && String(t.id) === String(track.id))) ||
    (track?.trackIndex != null && api.find((t) => t?.trackIndex === track.trackIndex)) ||
    (api.length > 0 && api.length === trackCount ? api[index] : null)
  const apiText = hit && !hit.locked ? String(hit.text || '').trim() : ''
  if (apiText) return apiText
  const chs = Array.isArray(staticChapters) ? staticChapters : []
  if (chs.length > 0 && chs.length === trackCount) {
    const c = chs[index]
    if (c && !c.locked && sameTitle(c.title, track?.title)) return String(c.text || '').trim()
  }
  return ''
}
