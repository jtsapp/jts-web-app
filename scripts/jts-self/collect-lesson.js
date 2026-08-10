// Разбирает html урока курса на стадии и сырые блоки ветки Self-Study.
//
// Три режима урока живут в одном html и различаются атрибутом data-only. Мы
// удаляем чужие узлы ДО разбора, иначе задания 1-to-1 и Group попали бы в
// тропу вперемешку с self — в источнике они стоят рядом, а не в разных ветках
// дерева.
const { JSDOM } = require('jsdom')

const MODE = 'self'

function pruneToMode(root) {
  for (const el of [...root.querySelectorAll('[data-only]')]) {
    const modes = (el.getAttribute('data-only') || '').split(/\s+/).filter(Boolean)
    // Пустой (или состоящий из пробелов) data-only — не «ничей», а «общий для
    // всех режимов»: разметка помечает так узлы, которые не относятся к
    // конкретному режиму отдельно. Резать их нельзя, иначе тихо теряем общий
    // контент. Семантика зеркалит web-admin/.../extract/prune-by-mode.ts.
    if (modes.length && !modes.includes(MODE)) el.remove()
  }
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()

/** Текст строки без содержимого интерактивных элементов. */
function promptOf(row, ...drop) {
  const copy = row.cloneNode(true)
  for (const sel of ['.opts', 'select', 'input', '.order', 'button', '.num', ...drop]) {
    for (const el of [...copy.querySelectorAll(sel)]) el.remove()
  }
  return clean(copy.textContent)
}

const optionsOf = (opts) => [...opts.querySelectorAll('.opt')].map((b) => clean(b.textContent))
const whyOf = (el) => clean(el.getAttribute('data-why'))

/** id трека из инлайнового вызова: playRange(A('x'),…) в A0, playTrack('x',…) в A1. */
function trackIdOf(button) {
  const on = button.getAttribute('onclick') || ''
  const m = /play(?:Track|Range)\(\s*(?:A\(\s*)?['"]([^'"]+)['"]/.exec(on)
  return m ? m[1] : null
}

/** Строка задания → сырой блок или null, если интерактива в ней нет. */
function blockFromRow(row) {
  const multi = row.querySelector('.opts[data-multi]')
  if (multi) {
    const correct = (multi.getAttribute('data-multi') || '')
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isInteger(n))
    return { kind: 'multi', prompt: promptOf(row), options: optionsOf(multi), correct, why: whyOf(multi) }
  }

  const opts = row.querySelector('.opts[data-correct]')
  if (opts) {
    return {
      kind: 'choice',
      prompt: promptOf(row),
      options: optionsOf(opts),
      correct: Number(opts.getAttribute('data-correct')),
      why: whyOf(opts),
    }
  }

  const select = row.querySelector('select[data-answer]')
  if (select) {
    // Первый option — приглашение «choose…» с пустым value; вариантом ответа
    // он не является.
    const options = [...select.querySelectorAll('option')]
      .filter((o) => o.getAttribute('value') !== '')
      .map((o) => clean(o.textContent))
      .filter(Boolean)
    return {
      kind: 'select',
      prompt: promptOf(row),
      options,
      answer: clean(select.getAttribute('data-answer')),
      why: whyOf(select),
    }
  }

  const input = row.querySelector('input[data-answer], textarea[data-answer]')
  if (input) {
    const parts = splitAround(row)
    return { kind: 'gap', before: parts.before, after: parts.after, answer: clean(input.getAttribute('data-answer')), why: whyOf(input) }
  }

  const order = row.querySelector('.order[data-order]')
  if (order) {
    const chips = [...order.querySelectorAll('.ochip')]
    return {
      kind: 'order',
      prompt: promptOf(row),
      words: chips.map((c) => clean((c.querySelector('.txt') || c).textContent)),
      order: chips.map((c) => Number(c.getAttribute('data-val'))),
      why: whyOf(order),
    }
  }

  return null
}

/**
 * Текст строки до и после поля ввода. Разрезать по первому пробелу нельзя:
 * «I ___ like Mondays.» дало бы before="I", after="like" и потеряло хвост,
 * поэтому место поля помечается меткой, которую не съест схлопывание пробелов.
 */
function splitAround(row) {
  const copy = row.cloneNode(true)
  for (const el of [...copy.querySelectorAll('.num')]) el.remove()
  const mark = copy.querySelector('input[data-answer], textarea[data-answer]')
  if (!mark) return { before: clean(copy.textContent), after: '' }

  const SENTINEL = ' §gap§ '
  mark.replaceWith(copy.ownerDocument.createTextNode(SENTINEL))
  const [before = '', after = ''] = clean(copy.textContent).split('§gap§')
  return { before: clean(before), after: clean(after) }
}

const audioButtonsOf = (node) =>
  node.matches('button.btn-audio') ? [node] : [...node.querySelectorAll('button.btn-audio')]

/**
 * Извлекает блоки audio и убирает из html ровно те кнопки, для которых блок
 * реально создан. Кнопку с onclick, не подходящим под шаблон (другая функция,
 * отсутствующий onclick, «стоп» с тем же классом btn-audio), трогать нельзя:
 * блок для неё не создан, а безусловное удаление стёрло бы кнопку бесследно —
 * вместе с ней исчез бы и весь узел, если она была его единственным
 * содержимым.
 */
function extractAudio(node, blocks) {
  for (const button of audioButtonsOf(node)) {
    const trackId = trackIdOf(button)
    if (trackId) {
      blocks.push({ kind: 'audio', trackId, label: clean(button.textContent) })
      button.remove()
    }
  }
}

/**
 * Объяснения, карточки слов, грамматическая справка. Они нужны целиком: без
 * них урок превращается в голый тест. Отдельно стоящую кнопку аудио
 * дублировать блоком info незачем, но только если она успешно стала блоком
 * audio (extractAudio уже вынул её из дерева); если onclick не разобрался,
 * кнопка осталась на месте и должна попасть в info как обычный контент.
 */
function pushInfo(node, blocks) {
  if (node.matches('button.btn-audio') && trackIdOf(node)) return
  const html = node.outerHTML.trim()
  if (clean(node.textContent) || /<(img|audio|video|table)/i.test(html)) blocks.push({ kind: 'info', html })
}

/**
 * Тройка «вынуть audio → пушнуть info», повторяющаяся для узла без задач и
 * для интро-контейнера рядом с задачей. Порядок обязателен: audio должен
 * появиться в блоках раньше info, который идёт следом в разметке.
 */
function pushAudioThenInfo(node, blocks) {
  extractAudio(node, blocks)
  pushInfo(node, blocks)
}

/**
 * Блоки одной стадии в порядке документа. Порядок здесь — часть методики:
 * инструкция и объяснение стоят перед вопросами, к которым относятся, поэтому
 * обходим детей стадии подряд, а не собираем сперва все задания.
 */
function collectStage(section) {
  const blocks = []
  const container = section.querySelector('.stage-body') || section

  for (const child of [...container.children]) {
    if (child.classList.contains('stage-head')) continue

    const isTask = child.matches('.task, [data-task]')
    const tasks = isTask ? [child] : [...child.querySelectorAll('.task, [data-task]')]

    if (!tasks.length) {
      // Та же история, что и в интро-ветке ниже: если не вынуть кнопку
      // плеера из поддерева до pushInfo, она останется в info-html мёртвым
      // onclick. Сам child, когда это просто кнопка, из своего дерева не
      // удаляется — pushInfo распознаёт этот случай отдельной проверкой.
      pushAudioThenInfo(child, blocks)
      continue
    }

    if (!isTask) {
      // Инструкция и кнопка плеера в реальной разметке иногда лежат в одном
      // контейнере с заданием, без обёртки .task над кнопкой (стадия
      // Listening в A0). Если не вынуть аудио здесь, оно останется внутри
      // info-блока сырым onclick="playRange(...)" — в новом приложении такой
      // функции нет, кнопка будет мёртвой. Поэтому сначала извлекаем блоки
      // audio, потом убираем сами кнопки из html, чтобы не дублировать.
      const intro = child.cloneNode(true)
      for (const task of [...intro.querySelectorAll('.task, [data-task]')]) task.remove()
      pushAudioThenInfo(intro, blocks)
    }

    for (const task of tasks) {
      extractAudio(task, blocks)
      const rows = [...task.querySelectorAll('.row')]
      for (const row of rows.length ? rows : [task]) {
        const block = blockFromRow(row)
        if (block) blocks.push(block)
      }
    }
  }
  return blocks
}

function collectLesson(html) {
  const { window } = new JSDOM(`<body>${html}</body>`)
  pruneToMode(window.document.body)

  return [...window.document.body.querySelectorAll('section.stage')].map((section) => ({
    name: section.getAttribute('data-stage') || '',
    blocks: collectStage(section),
  }))
}

module.exports = { collectLesson }
