// Стадия чтения из оригинального курса → шаги плеера «Обучения».
//
// На сайте стоит self-study редакция курса (jts-<level>-course.html), и тексты
// для чтения у неё свои — переписанные, короче, а в двух уроках чтения нет
// вовсе (A2 «The way things used to be», B1 «A film that travels»). Методист
// попросил чтение как в оригинальных файлах курса (A1_Elementary_final,
// A2_pre_inter_fixed, B1_inter_fixed, jts-b2_course_v5): их стадию Reading
// выгружает scripts/import-course-reading.js в data/course-reading/<level>.json
// — разметкой, только режим self, — а здесь она режется на экраны нашего
// плеера: текст отдельным экраном, дальше вопрос на экран, и над каждым
// вопросом текст, как во всех остальных уроках сайта.
//
// Разметка задания в курсе одна на все уровни:
//   .opts[data-correct]  + button.opt[data-val]   — один верный → choice
//   .opts[data-multi]                              — все верные   → multi
//   select[data-answer]                            — выпадающий   → choice
//   input[data-answer]  (варианты через «|»)       — впечатать    → gap / cloze
//   .order[data-order]  + button.ochip             — порядок      → order
//   .opentask                                      — без ответа   → pick / note
// Задания после кнопки аудио (.player) — это аудирование внутри стадии чтения:
// записей оригинала у нас нет, а своё аудирование у урока на сайте остаётся,
// поэтому до следующего текста они пропускаются.
const { JSDOM } = require('jsdom')

const escHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim()

// Номер задания в инструкции («2 · Read again…») на экране лишний: экраны идут
// по одному, и нумерация исходника с ними не совпадает.
const instructionText = (el) => squash(el.textContent).replace(/^\d+\s*·\s*/, '')

/**
 * Разметка текста → безопасный html для карточки: только b / i / br и абзацы.
 * Буква абзаца (<span class="pmark">A</span> у B1, pn у B2) остаётся —
 * задания на неё ссылаются («Which paragraph…», «Paragraph B»); без пробела
 * она слипалась со словом: «AIn 2019».
 */
function inlineHtml(node) {
  let out = ''
  for (const c of node.childNodes) {
    if (c.nodeType === 3) {
      out += escHtml(c.nodeValue)
      continue
    }
    if (c.nodeType !== 1) continue
    const tag = c.tagName.toLowerCase()
    if (tag === 'br') out += '<br>'
    else if (tag === 'b' || tag === 'strong') out += `<b>${inlineHtml(c)}</b>`
    else if (tag === 'i' || tag === 'em') out += `<i>${inlineHtml(c)}</i>`
    else if (c.classList.contains('pn') || c.classList.contains('pmark')) out += `<b>${escHtml(squash(c.textContent))}</b>&nbsp; `
    else out += inlineHtml(c)
  }
  return out.replace(/\s+/g, ' ')
}

// Служебные строки текста — подзаголовок, автор, источник — мелко, как
// подпись: у уровней они размечены по-разному.
const META = ['srcnote', 'src', 'stand', 'byline']

/** Текст для чтения: заголовок + абзацы (+ служебные строки мелко). */
function readingHtml(el) {
  const head = el.querySelector('h3, h4')
  const title = head ? squash(head.textContent) : ''
  const parts = []
  for (const p of el.querySelectorAll('p, li')) {
    const html = inlineHtml(p).trim()
    if (!html) continue
    if (META.some((m) => p.classList.contains(m))) parts.push(`<p class="cp-note__meta">${html}</p>`)
    else parts.push(`<p>${p.tagName === 'LI' ? '• ' : ''}${html}</p>`)
  }
  return { title, html: parts.join('') }
}

const answersOf = (el) =>
  String(el.getAttribute('data-answer') || '')
    .split('|')
    .map(squash)
    .filter(Boolean)

const whyOf = (el) => {
  const raw = el && el.getAttribute('data-why')
  if (!raw) return ''
  const doc = new JSDOM(`<body>${raw}</body>`).window.document
  return squash(doc.body.textContent)
}

/**
 * Варианты выпадающего списка без заглушки («—», «choose…»: у неё пустой
 * value) и ответ. Ответ в data-answer записан то текстом варианта, то его
 * value («two» → «Two kinds of people»), и регистр бывает другим.
 */
function selectChoice(sel) {
  const opts = [...sel.querySelectorAll('option')].filter((o) => o.getAttribute('value') !== '' && !/^[—-]?$/.test(squash(o.textContent)))
  const options = opts.map((o) => squash(o.textContent))
  const want = squash(sel.getAttribute('data-answer')).toLowerCase()
  const hit = opts.find((o) => (o.getAttribute('value') || '').toLowerCase() === want) || opts.find((o) => squash(o.textContent).toLowerCase() === want)
  return { options, answer: hit ? squash(hit.textContent) : null }
}

/**
 * Строка задания → последовательность кусков: текст и поля ответа в том
 * порядке, в каком они стоят в строке.
 */
function rowTokens(body) {
  const out = []
  const walk = (node) => {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) {
        out.push({ text: c.nodeValue })
        continue
      }
      if (c.nodeType !== 1) continue
      if (c.classList.contains('num') || c.classList.contains('ohint')) continue
      if (c.matches('div.opts')) out.push({ opts: c })
      else if (c.matches('select[data-answer]')) out.push({ select: c })
      else if (c.matches('input[data-answer]')) out.push({ input: c })
      else if (c.tagName === 'BUTTON') continue
      else walk(c)
    }
  }
  walk(body)
  return out
}

const textOfTokens = (tokens, render) =>
  squash(
    tokens
      .map((t, i) => (t.text != null ? t.text : render(t, i)))
      .join(' '),
  )

/**
 * Одна строка задания → шаги. base — общее для шагов этой строки (stage,
 * title, sub, html материала).
 */
function rowSteps(body, base) {
  const tokens = rowTokens(body)
  const opts = tokens.find((t) => t.opts)
  if (opts) {
    const el = opts.opts
    const buttons = [...el.querySelectorAll('button.opt')]
    const options = buttons.map((b) => squash(b.textContent))
    const prompt = textOfTokens(tokens.filter((t) => t.text != null), () => '')
    const multi = el.getAttribute('data-multi')
    if (multi != null) {
      const vals = multi.split(',').map(squash)
      const answers = buttons.filter((b) => vals.includes(b.getAttribute('data-val'))).map((b) => squash(b.textContent))
      if (!answers.length) return []
      return [{ ...base, type: 'multi', prompt, options, answers }]
    }
    const correct = el.getAttribute('data-correct')
    const right = buttons.find((b) => b.getAttribute('data-val') === correct)
    if (!right) return []
    return [{ ...base, type: 'choice', prompt, options, answer: squash(right.textContent), why: whyOf(el) || whyOf(right) }]
  }

  const selects = tokens.filter((t) => t.select)
  const inputs = tokens.filter((t) => t.input)
  const steps = []

  // Поля для ввода: одно — пропуск, несколько — текст с пропусками. Выпадающие
  // списки той же строки на этом экране показываются многоточием: они идут
  // следующими экранами.
  if (inputs.length === 1) {
    const at = tokens.indexOf(inputs[0])
    const side = (list) => textOfTokens(list, (t) => (t.select ? '…' : ''))
    steps.push({
      ...base,
      type: 'gap',
      before: side(tokens.slice(0, at)),
      after: side(tokens.slice(at + 1)),
      answers: answersOf(inputs[0].input),
      bank: [],
      why: whyOf(inputs[0].input),
    })
  } else if (inputs.length > 1) {
    let n = 0
    const gapped = textOfTokens(tokens, (t) => (t.input ? `<b>(${++n})</b> ______` : '…'))
    steps.push({
      ...base,
      type: 'cloze',
      sub: 'Впишите пропущенное слово в каждый пропуск.',
      html: `${base.html || ''}<p class="cp-note__meta">—</p><p>${gapped}</p>`,
      bank: [],
      answers: inputs.map((t) => answersOf(t.input)),
    })
  }

  for (const s of selects) {
    const { options, answer } = selectChoice(s.select)
    if (!answer) continue
    // Остальные поля строки уже решены на своих экранах — подставляем ответы.
    const prompt = textOfTokens(tokens, (t) => (t === s ? '____' : t.input ? answersOf(t.input)[0] : selectChoice(t.select).answer || '…'))
    steps.push({ ...base, type: 'choice', prompt, options, answer, why: whyOf(s.select) })
  }
  return steps
}

/**
 * Стадия чтения (разметка из data/course-reading) → шаги.
 * @param {string} html
 * @param {{stage: string}} opts stage — подпись стадии на экране
 */
function readingSteps(html, { stage }) {
  const doc = new JSDOM(`<body>${html}</body>`).window.document
  const steps = []
  let title = ''
  let sub = ''
  let material = ''
  let listening = false
  // Шаги последнего задания: подпись «Why» после него — разбор ответа.
  let lastTask = []
  let whyAt = 0

  const visit = (el) => {
    for (const c of el.children) {
      if (c.tagName === 'DIV' && !c.className) {
        visit(c)
        continue
      }
      const cls = c.classList
      if (cls.contains('stage-head') || cls.contains('photoslot') || cls.contains('writebox') || cls.contains('seglist')) continue
      // У A1 кнопка — «Read aloud by your device»: устройство читает тот же
      // текст, и задания за ней — к чтению. Аудирование — только настоящая
      // запись.
      if (cls.contains('player')) {
        if (!/read aloud/i.test(c.textContent)) listening = true
        continue
      }
      if (cls.contains('instruction')) {
        title = instructionText(c)
        sub = ''
        if (/^(now )?listen\b/i.test(title)) listening = true
        continue
      }
      if (cls.contains('subline')) {
        sub = squash(c.textContent)
        continue
      }
      if (cls.contains('reading') || cls.contains('rtext')) {
        const doc = readingHtml(c)
        if (!doc.html) continue
        listening = false
        const block = (doc.title ? `<h4>${escHtml(doc.title)}</h4>` : '') + doc.html
        material += block
        steps.push({ stage, type: 'note', title: doc.title || title, html: (sub && !doc.title ? `<p class="cp-note__meta">${escHtml(sub)}</p>` : '') + doc.html })
        lastTask = []
        continue
      }
      if (listening) continue
      if (cls.contains('bubble')) {
        const lab = squash((c.querySelector('.blab') || {}).textContent || '')
        const body = [...c.querySelectorAll('p, li')].map((p) => inlineHtml(p).trim()).filter(Boolean)
        if (/^why$/i.test(lab)) {
          // Разбор к ответу: n-я подпись после задания — к n-му его экрану.
          const target = lastTask[whyAt++]
          if (target && !target.why) target.why = squash(body.join(' ').replace(/<[^>]+>/g, ''))
        } else if (/after reading/i.test(lab) && body.length) {
          steps.push({ stage, type: 'note', title: lab, html: body.map((b) => `<p>${b}</p>`).join('') })
        }
        continue
      }
      const base = { stage, title, sub, html: material }
      if (cls.contains('opentask')) {
        const opts = c.querySelector('.opts')
        if (opts) {
          const options = [...opts.querySelectorAll('button')].map((b) => ({ label: squash(b.textContent) })).filter((o) => o.label)
          const hint = squash((c.querySelector('.ohint') || {}).textContent || '')
          if (options.length) steps.push({ stage, type: 'pick', title, sub: sub || hint, single: opts.getAttribute('data-multi') == null, options })
        } else {
          const lines = [...c.querySelectorAll('p, li')].map((p) => inlineHtml(p).trim()).filter(Boolean)
          if (lines.length) steps.push({ stage, type: 'note', title, html: lines.map((l) => `<p>${l}</p>`).join('') })
        }
        continue
      }
      if (cls.contains('task')) {
        const made = []
        const order = c.querySelector('.order[data-order]')
        if (order) {
          const chips = [...order.querySelectorAll('button.ochip')]
          const byVal = new Map(chips.map((b) => [b.getAttribute('data-val'), squash(b.textContent)]))
          const seq = order.getAttribute('data-order').split(',').map((v) => byVal.get(squash(v)))
          if (seq.every(Boolean)) made.push({ ...base, type: 'order', words: chips.map((b) => squash(b.textContent)), answer: seq.join(' ') })
        }
        const rows = c.querySelectorAll(':scope > .row, :scope > div > .row')
        // Строка целиком, а не только .body: у заголовков к абзацам список
        // стоит рядом с .body, а не внутри.
        for (const row of rows) made.push(...rowSteps(row, base))
        steps.push(...made)
        lastTask = made
        whyAt = 0
      }
    }
  }
  visit(doc.querySelector("section.stage") || doc.body)
  return steps
}

module.exports = { readingSteps, readingHtml, rowSteps }
