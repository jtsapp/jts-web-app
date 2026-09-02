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
  // B1/B2 называют стадии иначе: input — материал (чтение и аудирование),
  // prod — говорение и письмо, quiz/test — проверка в конце урока и юнита.
  input: 'Listening',
  prod: 'Speaking',
  quiz: 'Practice',
  test: 'Practice',
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
    // Массив заданий у B1/B2 разреженный: между группами в исходнике стоят
    // лишние запятые, и в дырах лежит undefined. Пропускаем их молча — это
    // разметка файла, а не потерянное задание.
    if (!g || !g.t) continue
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
        if (g.text && !sc.text) sc.text = g.text
        if (g.keep && sc.keep == null) sc.keep = g.keep
        if (g.phrase) sc.phrase = true
        screens.push(sc)
      })
    } else {
      screens.push(g)
    }
  }
  return screens
}

/**
 * Принимаемые ответы задания: сам ответ плюс альтернативные записи из alt.
 * У B1 alt стоит у 114 заданий («We've been friends since 2015.» и «We have
 * been friends since 2015») — без них верный ответ считался бы ошибкой.
 */
function acceptedList(sc) {
  return [...[].concat(sc.a == null ? [] : sc.a), ...[].concat(sc.alt || [])]
    .map((x) => String(x).trim())
    .filter(Boolean)
}

/** Подпись «начните с…» — на языке инструкции задания. */
const startLabel = (lang) => (lang === 'kk' ? 'Бастаңыз:' : lang === 'en' ? 'Start with:' : 'Начните так:')

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

/** Текст урока по ссылке: {t:"mcq", text:"t1"} → абзацы из lesson.texts.t1. */
function docHtml(doc) {
  if (!doc) return ''
  const paras = doc.paras || doc.para || []
  const title = doc.title ? `<h4>${esc(doc.title)}</h4>` : ''
  return title + paras.map((p) => `<p>${p}</p>`).join('')
}

/**
 * Материал, на который опирается вопрос: сам абзац задания, текст урока по
 * ссылке `text` или последний прочитанный кусок этой же стадии.
 *
 * Движок курса печатает текст НА КАЖДОМ экране («Read the text again. Choose
 * the correct answer.»), а у нас экран самостоятельный: без этой сборки 109
 * вопросов B1 к тексту и вопросы к треду постов остались бы без самого текста
 * — проверялась бы память, а не чтение.
 */
function materialHtml(sc, ctx) {
  const own = readerHtml(sc)
  if (own) return own
  if (sc.text && ctx.texts && ctx.texts[sc.text]) return docHtml(ctx.texts[sc.text])
  return (ctx.carry && ctx.carry.html) || ''
}

function tableHtml(sc, lang) {
  const head = Array.isArray(sc.head) ? sc.head : sc.head ? line(sc.head, lang) : []
  // Ячейка бывает и строкой, и объектом {en,ru,kk}: у B1 многоязычна вся
  // таблица, у A0 — только её шапка.
  const cell = (c) => line(c, lang)
  const headRow = (Array.isArray(head) ? head : []).map((h) => `<th>${esc(plain(h, lang))}</th>`).join('')
  const rows = (sc.rows || []).map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join('')}</tr>`).join('')
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
  const src = sc.clip ? ctx.clip(sc.clip) : null
  // Запись кладём в базу шага: клип висит на группе, и её наследуют не только
  // вопросы, но и соединение пар и разбор по колонкам — у B2 таких экранов
  // шестнадцать, и без этого они оставались немыми.
  const base = { stage, type: null, title, sub, ...(src ? { src } : {}) }

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

    // Разминка «отметь, что про тебя» у B1/B2 называется pick, а варианты в
    // ней — строки или многоязычные объекты, без иконок.
    case 'pick':
      return {
        ...base,
        type: 'pick',
        options: (sc.items || []).map((it) => ({ label: typeof it === 'string' ? it : plain(it.w || it, lang) })),
      }

    case 'cards':
      return {
        ...base,
        type: 'cards',
        title: title || 'Слова урока',
        sub: sub || 'Нажми на карточку, чтобы увидеть перевод',
        words: (sc.items || []).map((it) => ({
          en: it.w,
          pos: it.pos || '',
          ru: it.ru || '',
          kk: it.kk || '',
          def: plain(it.def || it.use || '', 'en'),
          img: ctx.img(it.w),
          audio: (it.wordClip && ctx.clip(it.wordClip)) || ctx.wordAudio(it.w),
        })),
      }

    case 'mcq': {
      const prompt = plain(sc.q, lang) || splitGapPrompt(sc.line)
      // Варианты у B1 многоязычные ({en,ru,kk}), у остальных — строки.
      const opts = (sc.opts || []).map((o) => plain(o, lang))
      return {
        ...base,
        type: 'choice',
        prompt,
        options: opts,
        // keep в источнике значит «порядок вариантов осмысленный» — шкала,
        // числа, шаги по времени. Плеер перемешивает варианты всегда, и без
        // этого флага «About 150 / About 50 / About 20» встаёт вразнобой.
        keep: !!sc.keep,
        answer: opts[sc.a],
        why: plain(sc.why, lang) || '',
        html: materialHtml(sc, ctx),
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
        options: (sc.opts || []).map((o) => plain(o, lang)),
        answer: plain((sc.opts || [])[sc.a], lang),
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
        html: materialHtml(sc, ctx),
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
        html: materialHtml(sc, ctx),
        src,
      }

    case 'qa':
      return {
        ...base,
        type: 'choice',
        prompt: plain(sc.q, lang),
        options: (sc.opts || []).map((o) => plain(o, lang)),
        answer: plain((sc.opts || [])[sc.a], lang),
        why: plain(sc.why, lang) || '',
        html: materialHtml(sc, ctx),
        src,
      }

    case 'notice':
      return {
        ...base,
        type: 'choice',
        prompt: plain(sc.q, lang),
        options: (sc.opts || []).map((o) => plain(o, lang)),
        answer: plain((sc.opts || [])[sc.a], lang),
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
        answers: acceptedList(sc),
        bank: sc.bank ? shuffle(sc.bank, seed) : [],
        why: plain(sc.why, lang) || '',
        html: materialHtml(sc, ctx),
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
        answers: acceptedList(sc),
        bank: [],
        why: plain(sc.why, lang) || '',
        html: materialHtml(sc, ctx) + (sc.given ? `<p class="cp-given">${sc.given}</p>` : ''),
        src,
      }
    }

    // «Перепиши предложение». Исходная фраза лежит в from (A2) или given (B1),
    // а ответ в данных — ВСЯ новая фраза целиком, вместе с началом из start.
    // Класть start в левую половину пропуска нельзя: плеер тогда ждёт от
    // студента только хвост, а сверяет с целой фразой — не совпадёт никогда.
    // Поэтому поле пустое, а начало и подсказка идут текстом над ним.
    case 'trans':
    case 'transform': {
      const from = plain(sc.from || sc.given || sc.s || '', lang)
      const task = plain(sc.task || sc.cue || '', lang)
      const start = sc.start ? String(sc.start) : ''
      return {
        ...base,
        type: 'gap',
        title: title || task,
        sub: [task && title ? task : sub, start ? `${startLabel(lang)} ${start}…` : ''].filter(Boolean).join(' '),
        before: '',
        after: '',
        answers: acceptedList(sc),
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
    case 'mistake': {
      // Индекс неверного слова записан по-разному: bad у A0/A2, a у B1.
      const bad = sc.bad != null ? sc.bad : sc.a
      return {
        ...base,
        type: 'mistake',
        tokens: sc.tok || sc.words || [],
        bad,
        answer: plain(sc.fix, lang) || '',
        why: plain(sc.why, lang) || '',
      }
    }

    // Колонка задана либо строкой («was» / «were»), либо {icon,t}.
    case 'cols':
      return {
        ...base,
        type: 'cols',
        columns: (sc.cols || []).map((c) => (typeof c === 'string' ? c : plain(c.t || c, lang))),
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
        const left = plain(p.w || p.l || '', lang)
        const own = plain(p.t || p.r || p.ru || '', lang)
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

    // Слайдер примеров. Когда у примеров есть записи (B1), это те же строки
    // «послушай и повтори», что и chunk, — карусель без звука их бы заглушила.
    case 'slider':
      if ((sc.items || []).some((it) => it && it.clip)) {
        return {
          ...base,
          type: 'phrases',
          items: (sc.items || []).map((it) => ({ text: plain(it.s, lang), src: it.clip ? ctx.clip(it.clip) : null })),
        }
      }
      return {
        ...base,
        type: 'note',
        html: '',
        examples: (sc.items || []).map((it) => plain(it.s, lang)),
      }

    case 'text':
    case 'read': {
      // Текст для чтения у B1 лежит при уроке, а задание ссылается на него по
      // имени ({t:"read", text:"t1"}) — без разыменования экран остался бы
      // пустой инструкцией «Прочитайте текст».
      const doc = sc.text && ctx.texts ? ctx.texts[sc.text] : null
      const paras = (doc && (doc.paras || doc.para)) || []
      const body = (sc.body || []).map((b) => `<p>${line(b, lang)}</p>`).join('')
      const kicker = sc.kicker ? `<p class="cp-note__meta">${plain(sc.kicker, lang)}</p>` : ''
      return {
        ...base,
        type: 'note',
        title: plain((doc && doc.title) || sc.title || sc.ins, lang) || (sc.read && plain(sc.read.title, lang)) || title,
        sub: sub || plain(doc && doc.kicker, lang),
        html:
          kicker +
          (sc.meta ? `<p class="cp-note__meta">${esc(sc.meta)}</p>` : '') +
          body +
          paras.map((x) => `<p>${x}</p>`).join('') +
          readerHtml(sc) +
          (sc.note ? `<p>${sc.note}</p>` : ''),
      }
    }

    // Разбор правила и решённый пример (B1 expl, B2 rule / worked / examples):
    // всё это объяснение, читается и идёт дальше.
    case 'expl':
      return {
        ...base,
        type: 'note',
        title: title || plain(sc.kicker, lang),
        sub: title ? sub : '',
        html: (sc.body || []).map((b) => `<p>${line(b, lang)}</p>`).join(''),
      }

    case 'rule':
      return {
        ...base,
        type: 'note',
        title: plain(sc.h, lang) || title,
        html: (sc.blocks || []).map((b) => `<p>${line(b, lang)}</p>`).join(''),
      }

    case 'worked':
      return {
        ...base,
        type: 'note',
        title: plain(sc.title, lang) || title,
        html: `<ol class="cp-steps">${(sc.steps || []).map((x) => `<li>${line(x, lang)}</li>`).join('')}</ol>`,
      }

    case 'examples':
      return {
        ...base,
        type: 'note',
        html: (sc.items || [])
          .map((it) => `<p>${line(it.s, lang)}${it.note ? `<br><span class="cp-note__meta">${line(it.note, lang)}</span>` : ''}</p>`)
          .join(''),
      }

    case 'reader':
      return {
        ...base,
        type: 'note',
        title: plain(sc.title, lang) || title,
        sub: plain(sc.by, lang) || sub,
        html: (sc.paras || []).map((x) => `<p>${x}</p>`).join(''),
      }

    // Лента постов (B1): образец письменной работы — три реплики с автором.
    case 'posts':
      return {
        ...base,
        type: 'note',
        title: title || plain(sc.kicker, lang),
        html: (sc.posts || [])
          .map(
            (x) =>
              `<div class="cp-post"><p class="cp-post__who"><b>${esc(x.name || '')}</b>` +
              `${x.meta ? ` <span>${esc(x.meta)}</span>` : ''}</p><p>${x.body || ''}</p>` +
              `${x.tags ? `<p class="cp-note__meta">${esc(x.tags)}</p>` : ''}</div>`,
          )
          .join(''),
      }

    // «Скажи вслух» (B1 say): подсказки к устному ответу, записи нет.
    case 'say':
      return {
        ...base,
        type: 'record',
        items: (sc.prompts || sc.lines || []).map((x) => plain(x, lang)),
      }

    // Соединение пар B2: слева слово, справа его значение.
    case 'extmatch': {
      const pairs = (sc.pairs || []).map((x) => ({ left: plain(x.l, lang), right: plain(x.r, lang) })).filter((x) => x.left && x.right)
      if (!pairs.length) return null
      return { ...base, type: 'match', pairs, options: shuffle(pairs.map((x) => x.right), seed) }
    }

    // Текст с пронумерованными пропусками и общим банком слов.
    case 'cloze': {
      // Подпись исходника описывает его собственный жест («tap a word, then tap
      // the gap»), а у нас ответ вписывается в поле. Оставить её значило бы
      // объяснять студенту управление, которого на экране нет.
      const ru = typeof sc.sub === 'object' && sc.sub && sc.sub.ru
      return {
        ...base,
        sub: ru ? 'Впишите пропущенное слово в каждый пропуск.' : 'Type the missing word in each gap.',
        type: 'cloze',
        html: sc.text || '',
        bank: shuffle(sc.bank || [], seed),
        answers: (sc.a || sc.answers || []).map((x) => (Array.isArray(x) ? x.map(String) : [String(x)])),
      }
    }

    // Конспект под запись (B2 notes): несколько пропусков на одном экране,
    // у каждого свой набор принимаемых ответов.
    case 'notes':
      return {
        ...base,
        type: 'group',
        src,
        items: (sc.rows || []).map((r) => {
          const { before, after } = splitGap(r.line)
          return {
            before: r.k ? `${plain(r.k, lang)} — ${before}` : before,
            after,
            answers: acceptedList(r),
          }
        }),
      }

    // Цепочка переписываний (B2 chain): каждый шаг — свой ответ, но экран один.
    case 'chain':
      return {
        ...base,
        type: 'group',
        html: sc.start ? `<p class="cp-given"><b>${esc(sc.start)}</b></p>` : '',
        items: (sc.steps || []).map((st) => ({
          before: plain(st.ins, lang),
          after: st.hint ? `(${plain(st.hint, lang)}…)` : '',
          answers: acceptedList(st),
        })),
      }

    // «Найди ошибки» B2: неверных слов несколько, и правка у каждого своя.
    case 'err': {
      const bad = [].concat(sc.bad == null ? [] : sc.bad).map(Number)
      if (!bad.length || !(sc.tokens || []).length) return null
      const fixes = sc.fix || {}
      return {
        ...base,
        type: 'mistake',
        tokens: sc.tokens,
        bad,
        answer: bad.map((i) => `${sc.tokens[i]} → ${fixes[i] != null ? fixes[i] : '?'}`).join(', '),
        why: plain(sc.why, lang) || '',
      }
    }

    // Видео-репортаж юнита: файл лежит рядом с курсом, а не в самом файле.
    case 'video': {
      const video = ctx.video ? ctx.video(sc.file) : null
      if (!video) return null
      return { ...base, type: 'watch', title: plain(sc.title, lang) || title, sub: sub || plain(sc.note, lang), src: video }
    }

    // Вопрос теста или квиза — тот же выбор варианта, только с пометкой темы.
    case 'quizItem':
    case 'testItem':
      return {
        ...base,
        type: 'choice',
        title: title || plain(sc.tag, lang) || 'Проверка',
        prompt: plain(sc.q, lang) || splitGapPrompt(sc.line),
        options: (sc.opts || []).map((o) => plain(o, lang)),
        answer: plain((sc.opts || [])[sc.a], lang),
        why: plain(sc.why, lang) || '',
        src: sc.clip ? ctx.clip(sc.clip) : null,
      }

    case 'model':
      return {
        ...base,
        type: 'note',
        title: plain(sc.genre || sc.head || sc.ins, lang) || title,
        html: (sc.head ? `<h4>${esc(sc.head)}</h4>` : '') + (sc.para || []).map((p) => `<p>${p}</p>`).join(''),
      }

    case 'write': {
      // plan у B1/B2 — список шагов, у A2 — строка-подсказка: приводим к списку.
      const planItems = Array.isArray(sc.plan) ? sc.plan : sc.plan ? [sc.plan] : []
      const plan = planItems.map((x) => `<li>${line(x, lang)}</li>`).join('')
      const useful = sc.useful && sc.useful.items
        ? `<p class="cp-note__meta">${esc(plain(sc.useful.title, lang) || 'Useful language')}</p>` +
          `<ul class="cp-frames">${sc.useful.items.map((x) => `<li>${line(x, lang)}</li>`).join('')}</ul>`
        : ''
      const frames = (sc.frames || []).map((f) => `<li>${esc(f)}</li>`).join('')
      const bank = (sc.bank || []).map((w) => `<span class="cp-note__chip">${esc(w)}</span>`).join('')
      const checks = (sc.checks || []).map((c) => `<li>${line(c, lang)}</li>`).join('')
      return {
        ...base,
        type: 'write',
        placeholder: sc.ph || sc.placeholder || '',
        html:
          (plan ? `<ol class="cp-steps">${plan}</ol>` : '') +
          (frames ? `<ul class="cp-frames">${frames}</ul>` : '') +
          useful +
          (bank ? `<div class="cp-note__chips">${bank}</div>` : ''),
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
        title: plain(sc.done, lang) || plain(sc.title, lang) || 'Урок пройден',
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

// Экраны, которые ДАЮТ материал: текст, тред, расшифровка. Вопросы к ним идут
// следом и своего текста не несут.
const MATERIAL_TYPES = new Set(['text', 'read', 'reader', 'posts'])

/** Слово → перевод по карточкам урока: нужен упражнению на соединение у A0. */
function lessonGlossary(groups, lang = 'ru') {
  const map = new Map()
  for (const g of groups || []) {
    if (!g || g.t !== 'cards') continue
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
  const full = {
    ...ctx,
    seedBase: `${ctx.level}:${lesson.key}`,
    translate: (w) => glossary.get(w) || null,
    texts: lesson.texts || {},
  }
  const out = []
  // Последний прочитанный материал этой стадии: тред постов, текст статьи,
  // расшифровка. Вопросы, которые идут следом, ссылаются на него словами
  // «прочитайте ещё раз», поэтому он едет с ними.
  let carry = null
  for (const sc of screens) {
    if (!sc || !sc.t) continue
    if (MATERIAL_TYPES.has(sc.t)) carry = null
    const step = screenToStep(sc, { ...full, carry })
    if (!step) continue
    // У карточки-заметки плеер печатает только заголовок и html: подпись он не
    // рисует вовсе (см. блок шапки в CourseStepPlayer). Поэтому подпись
    // переносим внутрь карточки — иначе «Subject questions on the left of each
    // pair» и подобные пояснения исчезали бы вместе с ней.
    if (step.type === 'note' && step.sub) {
      step.html = `<p class="cp-note__meta">${step.sub}</p>${step.html || ''}`
      step.sub = ''
    }
    if (MATERIAL_TYPES.has(sc.t) && step.html) carry = { stage: step.stage, html: step.html }
    else if (carry && step.stage !== carry.stage) carry = null
    out.push(step)
  }
  return out
}

module.exports = { flattenGroups, screenToStep, lessonSteps, splitGap, STAGE_NAMES, shuffle, hashSeed, line, plain }
