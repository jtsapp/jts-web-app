// Переводит уроки self-study курса нового поколения в шаги плеера
// (src/learning/CourseStepPlayer.jsx).
//
// Курс уже устроен «одно задание — один экран»: его собственный движок гоняет
// groups через flatten() и рисует по экрану на элемент. Мы повторяем ту же
// раскладку (PER_ITEM читается из самого файла, а не зашит здесь), поэтому
// порядок и количество экранов в приложении совпадают с оригиналом.
//
// Чего в плеере нет — добавлено типами шагов mistake / cols / phrases / record,
// остальное ложится на существующие: choice, gap, order, match, listen, cards,
// note, pick, write, checklist.
const STAGE_NAMES = {
  warm: 'Warm-up',
  vocab: 'Vocabulary',
  gram: 'Grammar',
  prac: 'Practice',
  lisrd: 'Listening',
  freer: 'Speaking',
  wrap: 'Wrap',
}

/** Строка курса: либо готовая строка, либо {en,ru,kk}. */
function line(v, lang = 'ru') {
  if (v == null) return ''
  if (typeof v === 'string') return v
  return v[lang] || v.en || v.ru || ''
}
/** То же, но без разметки — для заголовков и вариантов ответа. */
function plain(v, lang = 'ru') {
  return String(line(v, lang))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Перемешивание с фиксированным зерном: банк слов и варианты не должны
// приходить в порядке «первый — правильный», но и меняться от сборки к сборке
// им нельзя — иначе каждый прогон экстрактора переписывает все steps-файлы.
function seeded(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}
function shuffle(arr, seed) {
  const rnd = seeded(seed)
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Раскладка групп по экранам — та же, что делает движок курса:
 * элементы «поштучных» типов (PER_ITEM) становятся отдельными экранами и
 * наследуют инструкцию, подпись и дорожку группы.
 *
 * Карточки слов — намеренное исключение: в оригинале это стопка экранов по
 * слову, а у плеера стадия словаря — одна сетка карточек. Разворачивать её в
 * 4 экрана значит показать одно и то же четырежды.
 */
function flattenGroups(groups, perItem) {
  const screens = []
  for (const g of groups || []) {
    const single = perItem[g.t]
    if (single && g.t !== 'cards' && Array.isArray(g.items)) {
      g.items.forEach((it, n) => {
        const sc = { ...it, t: single, stage: g.stage, group: g, n, of: g.items.length }
        if (!sc.ins) sc.ins = g.ins
        if (!sc.sub) sc.sub = g.sub
        if (g.track) sc.track = g.track
        if (g.who) sc.who = g.who
        if (g.lines) sc.lines = g.lines
        if (g.para) sc.para = g.para
        if (g.clip && !sc.clip) sc.clip = g.clip
        if (g.phrase) sc.phrase = true
        screens.push(sc)
      })
    } else {
      screens.push(g)
    }
  }
  return screens
}

/** Разбивает строку с пропуском на половинки для шага gap. */
function splitGap(text) {
  const s = String(text || '')
    .replace(/<u>[\s\S]*?<\/u>/g, '___')
    .replace(/<[^>]+>/g, '')
  const i = s.indexOf('___')
  if (i < 0) return { before: s.trim(), after: '' }
  return { before: s.slice(0, i).trim(), after: s.slice(i + 3).trim() }
}

/** Читаемый кусок текста задания (диалог, абзацы) в html для плеера. */
function readerHtml(sc) {
  const paras = sc.para || sc.lines || (sc.read && sc.read.para) || []
  if (!paras.length) return ''
  const who = sc.who ? `<p class="cp-who">${esc(sc.who)}</p>` : ''
  return who + paras.map((p) => `<p>${p}</p>`).join('')
}

function tableHtml(sc, lang) {
  const head = Array.isArray(sc.head) ? sc.head : sc.head ? line(sc.head, lang) : []
  const headRow = (Array.isArray(head) ? head : []).map((h) => `<th>${esc(h)}</th>`).join('')
  const rows = (sc.rows || []).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
  const explain = (sc.explain || []).map((p) => `<p>${line(p, lang)}</p>`).join('')
  const fwd = sc.fwd ? `<p class="cp-note__fwd">${line(sc.fwd, lang)}</p>` : ''
  return `<table class="cp-table">${headRow ? `<tr>${headRow}</tr>` : ''}${rows}</table>${explain}${fwd}`
}

/**
 * Экран курса → шаг плеера.
 * @param {object} sc экран (после flattenGroups)
 * @param {object} ctx { lang, clip(key), img(word), wordAudio(word), seedBase }
 * @returns {object|null} шаг или null, если экран не переносится
 */
function screenToStep(sc, ctx) {
  const lang = ctx.lang || 'ru'
  const stage = STAGE_NAMES[sc.stage] || 'Practice'
  const title = plain(sc.ins, lang)
  const sub = plain(sc.sub, lang)
  const seed = hashSeed(`${ctx.seedBase || ''}:${sc.t}:${title}:${JSON.stringify(sc.opts || sc.a || sc.w || '')}`)
  const base = { stage, type: null, title, sub }
  const src = sc.clip ? ctx.clip(sc.clip) : null

  switch (sc.t) {
    case 'cover': {
      const aims = (sc.aims || []).map((a) => `<li>${line(a.t, lang)}</li>`).join('')
      return {
        ...base,
        type: 'note',
        title: plain(sc.title, lang).replace(/\n/g, ' '),
        sub: '',
        html: `<p>${line(sc.lead, lang)}</p>${aims ? `<ul class="cp-aims">${aims}</ul>` : ''}`,
      }
    }

    case 'tap':
      return { ...base, type: 'pick', options: (sc.items || []).map((it) => ({ label: it.w || plain(it, lang) })) }

    case 'poll': {
      const it = (sc.items || [])[0] || {}
      return {
        ...base,
        type: 'pick',
        title: plain(it.q, lang) || title,
        sub: title && plain(it.q, lang) ? title : sub,
        single: true,
        options: (it.opts || []).map((o) => ({ label: o })),
      }
    }

    case 'tick':
      return { ...base, type: 'pick', options: (sc.items || []).map((it) => ({ label: it.w })) }

    case 'cards':
      return {
        ...base,
        type: 'cards',
        title: title || 'Слова урока',
        sub: sub || 'Нажми на карточку, чтобы увидеть перевод',
        words: (sc.items || []).map((it) => ({
          en: it.w,
          ru: it.ru || '',
          kk: it.kk || '',
          def: plain(it.def || it.use || '', 'en'),
          img: ctx.img(it.w),
          audio: (it.wordClip && ctx.clip(it.wordClip)) || ctx.wordAudio(it.w),
        })),
      }

    case 'mcq': {
      const prompt = plain(sc.q, lang) || splitGapPrompt(sc.line)
      return {
        ...base,
        type: 'choice',
        prompt,
        options: sc.opts || [],
        answer: (sc.opts || [])[sc.a],
        why: plain(sc.why, lang) || '',
        html: readerHtml(sc),
        src,
      }
    }

    // Слово на слух: в задании оно не написано нигде, звучит только по кнопке.
    // Файл ищем в том же порядке, что и карточка словаря — запись курса, потом
    // сгенерированная озвучка слова. Иначе одно и то же слово звучало бы на
    // карточке записью, а через два экрана — синтезом, и задание проверяло бы
    // способность узнать чужой голос.
    case 'pic':
      return {
        ...base,
        type: 'choice',
        say: sc.w || '',
        sayTrack: (sc.wordClip && ctx.clip(sc.wordClip)) || ctx.wordAudio(sc.w) || null,
        options: sc.opts || [],
        answer: (sc.opts || [])[sc.a],
        why: plain(sc.why, lang) || '',
      }

    case 'listen': {
      if (sc.mode === 'gap') {
        const { before, after } = splitGap(sc.line)
        return { ...base, type: 'gap', before, after, answers: [sc.a], bank: sc.bank || [], src }
      }
      const opts = sc.pics || sc.opts || []
      return {
        ...base,
        type: 'listen',
        prompt: plain(sc.q, lang),
        src,
        options: opts,
        answer: opts[sc.a],
        html: readerHtml(sc),
      }
    }

    case 'tf':
      return {
        ...base,
        type: 'choice',
        prompt: plain(sc.s, lang),
        options: ['True', 'False'],
        answer: sc.a ? 'True' : 'False',
        why: plain(sc.why, lang) || '',
        html: readerHtml(sc),
        src,
      }

    case 'qa':
      return {
        ...base,
        type: 'choice',
        prompt: plain(sc.q, lang),
        options: sc.opts || [],
        answer: (sc.opts || [])[sc.a],
        why: plain(sc.why, lang) || '',
        html: readerHtml(sc),
        src,
      }

    case 'notice':
      return {
        ...base,
        type: 'choice',
        prompt: plain(sc.q, lang),
        options: sc.opts || [],
        answer: (sc.opts || [])[sc.a],
        why: plain(sc.why, lang) || '',
        html: (sc.examples || []).map((e) => `<p>${e}</p>`).join(''),
      }

    case 'gap': {
      const { before, after } = splitGap(sc.line)
      return {
        ...base,
        type: 'gap',
        before,
        after,
        answers: [sc.a],
        bank: sc.bank ? shuffle(sc.bank, seed) : [],
        why: plain(sc.why, lang) || '',
        html: readerHtml(sc),
        src,
      }
    }

    // Печатный ответ — тот же gap, только без банка слов: поле проверяется
    // по эталону (см. lib/answer-match.js), как и пропуск.
    case 'type': {
      const { before, after } = splitGap(sc.line || sc.given || '')
      return {
        ...base,
        type: 'gap',
        before,
        after,
        answers: [].concat(sc.a).map(String),
        bank: [],
        why: plain(sc.why, lang) || '',
        html: readerHtml(sc) + (sc.given ? `<p class="cp-given">${sc.given}</p>` : ''),
        src,
      }
    }

    case 'trans':
    case 'transform': {
      const from = sc.from || sc.s || ''
      const task = plain(sc.task || sc.cue || '', lang)
      return {
        ...base,
        type: 'gap',
        title: title || task,
        sub: task && title ? task : sub,
        before: sc.start ? String(sc.start) : '',
        after: '',
        answers: [].concat(sc.a).map(String),
        bank: [],
        why: plain(sc.why, lang) || '',
        html: from ? `<p class="cp-given"><b>${esc(from)}</b></p>` : '',
      }
    }

    case 'order': {
      const words = String(sc.a || '').split(/\s+/).filter(Boolean)
      return { ...base, type: 'order', words: shuffle(words, seed), answer: String(sc.a || ''), why: plain(sc.why, lang) || '' }
    }

    // Слова предложения у A0/A2 лежат в tok, у A1 — в words: один и тот же
    // экран, разные поколения файла.
    case 'mistake':
      return {
        ...base,
        type: 'mistake',
        tokens: sc.tok || sc.words || [],
        bad: sc.bad,
        answer: sc.fix || '',
        why: plain(sc.why, lang) || '',
      }

    // Колонка задана либо строкой («was» / «were»), либо {icon,t}.
    case 'cols':
      return {
        ...base,
        type: 'cols',
        columns: (sc.cols || []).map((c) => (typeof c === 'string' ? c : plain(c.t, lang))),
        items: shuffle((sc.items || []).map((it) => ({ text: it.w, col: it.c })), seed),
      }

    // Пара: у A1 это {l,r}, у A2 — {w,t}. У A0 правая половина — картинка
    // ({w,icon}), а картинок слов этот источник не даёт вовсе, и пара
    // выродилась бы в «listen ↔ listen». Берём перевод слова из карточек того
    // же урока — упражнение остаётся упражнением; нет перевода — экран не
    // переносим (лучше без задания, чем задание без вопроса).
    case 'match': {
      const pairs = []
      let translated = false
      for (const p of sc.pairs || []) {
        const left = p.w || p.l || ''
        const own = p.t || p.r || p.ru || ''
        const right = own || (ctx.translate ? ctx.translate(left) : null) || ''
        if (!own && right) translated = true
        if (!left || !right || right === left) return null
        pairs.push({ left, right })
      }
      if (!pairs.length) return null
      // Инструкция источника обещает картинки («Match the words and the
      // pictures») — с переводом вместо картинки она врёт про задание.
      const title = translated ? (lang === 'kk' ? 'Сөз бен аудармасын сәйкестендіріңіз.' : 'Соедините слово и перевод.') : base.title
      return { ...base, title, type: 'match', pairs, options: shuffle(pairs.map((p) => p.right), seed) }
    }

    case 'chunk':
    case 'panel':
    case 'useful':
      return {
        ...base,
        title: title || plain(sc.title, lang),
        type: 'phrases',
        items: (sc.items || []).map((it) =>
          typeof it === 'string'
            ? { text: it, src: null }
            : { text: plain(it.s, lang), src: it.clip ? ctx.clip(it.clip) : null },
        ),
      }

    case 'table':
      return { ...base, type: 'note', html: tableHtml(sc, lang) }

    case 'slider':
      return {
        ...base,
        type: 'note',
        html: '',
        examples: (sc.items || []).map((it) => plain(it.s, lang)),
      }

    case 'text':
    case 'read':
      return {
        ...base,
        type: 'note',
        title: plain(sc.title || sc.ins, lang) || (sc.read && plain(sc.read.title, lang)) || title,
        html:
          (sc.meta ? `<p class="cp-note__meta">${esc(sc.meta)}</p>` : '') +
          readerHtml(sc) +
          (sc.note ? `<p>${sc.note}</p>` : ''),
      }

    case 'model':
      return {
        ...base,
        type: 'note',
        title: plain(sc.genre || sc.head || sc.ins, lang) || title,
        html: (sc.head ? `<h4>${esc(sc.head)}</h4>` : '') + (sc.para || []).map((p) => `<p>${p}</p>`).join(''),
      }

    case 'write': {
      const frames = (sc.frames || []).map((f) => `<li>${esc(f)}</li>`).join('')
      const bank = (sc.bank || []).map((w) => `<span class="cp-note__chip">${esc(w)}</span>`).join('')
      const checks = (sc.checks || []).map((c) => `<li>${line(c, lang)}</li>`).join('')
      return {
        ...base,
        type: 'write',
        placeholder: sc.ph || sc.placeholder || '',
        html: (frames ? `<ul class="cp-frames">${frames}</ul>` : '') + (bank ? `<div class="cp-note__chips">${bank}</div>` : ''),
        modelHtml: sc.model
          ? `<p>${sc.model}</p>`
          : checks
            ? `<ul class="cp-checks">${checks}</ul>`
            : '',
      }
    }

    case 'record':
      return {
        ...base,
        type: 'record',
        items: (sc.lines || sc.items || []).map((l) => (typeof l === 'string' ? l : plain(l.s, lang))),
      }

    case 'wrap':
      return {
        ...base,
        type: 'checklist',
        title: plain(sc.done, lang) || 'Урок пройден',
        sub: plain(sc.progress, lang),
        items: (sc.can || []).map((c) => plain(c.t, lang)),
      }

    // Обложка и итог теста рисуются самим приложением (экран результата урока),
    // поэтому в шаги не переносятся.
    case 'tcover':
    case 'tresult':
      return null

    default:
      throw new Error(`неизвестный тип задания курса: ${sc.t}`)
  }
}

// Вопрос шага mcq, когда он задан строкой с пропуском: <u></u> в разметке
// курса — это и есть место ответа, в плеере оно рисуется как ___.
function splitGapPrompt(text) {
  if (!text) return ''
  return String(text)
    .replace(/<u>[\s\S]*?<\/u>/g, '___')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Слово → перевод по карточкам урока: нужен упражнению на соединение у A0. */
function lessonGlossary(groups, lang = 'ru') {
  const map = new Map()
  for (const g of groups || []) {
    if (g.t !== 'cards') continue
    for (const it of g.items || []) {
      const tr = lang === 'kk' ? it.kk : it.ru
      if (it.w && tr) map.set(it.w, tr)
    }
  }
  return map
}

/** Урок целиком: экраны → шаги. */
function lessonSteps(lesson, perItem, ctx) {
  const screens = flattenGroups(lesson.groups, perItem)
  const glossary = lessonGlossary(lesson.groups, ctx.lang)
  const full = { ...ctx, seedBase: `${ctx.level}:${lesson.key}`, translate: (w) => glossary.get(w) || null }
  const out = []
  for (const sc of screens) {
    const step = screenToStep(sc, full)
    if (step) out.push(step)
  }
  return out
}

module.exports = { flattenGroups, screenToStep, lessonSteps, splitGap, STAGE_NAMES, shuffle, hashSeed, line, plain }
