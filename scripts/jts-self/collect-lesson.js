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

/**
 * Индекс верного варианта в списке кнопок .opt.
 *
 * Формат ключа ответа у уровней разный: A0 пишет data-correct="0" (и его
 * кнопки размечены data-val="0","1",…), A1 — data-correct="c" при
 * data-val="a","b","c". Приведение к числу давало на A1 NaN, и весь уровень
 * оставался без единого задания choice. Поэтому ключ ответа не «индекс» и не
 * «буква», а ЗНАЧЕНИЕ кнопки: ищем позицию кнопки, чей data-val совпал.
 * Числовой формат A0 при этом работает сам собой — там значения и есть
 * индексы. Та же модель, что у .order (ранг чипа — позиция его data-val в
 * data-order), и по той же причине: спецкейсов по уровню быть не должно.
 * Значение, которого нет ни у одной кнопки, даёт -1 — сырые данные без
 * валидации, непроверяемое задание отбраковывает normalize-task.
 */
const optionIndexOf = (opts, value) =>
  [...opts.querySelectorAll('.opt')].findIndex((b) => clean(b.getAttribute('data-val')) === clean(value))

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
    // data-multi — список тех же значений data-val через запятую (в A0 это
    // "0,1,2,…", потому что там значения числовые). Разбираем его так же, как
    // одиночный data-correct: позиция кнопки с таким значением.
    const correct = (multi.getAttribute('data-multi') || '')
      .split(',')
      .filter((v) => clean(v))
      .map((v) => optionIndexOf(multi, v))
    return { kind: 'multi', prompt: promptOf(row), options: optionsOf(multi), correct, why: whyOf(multi) }
  }

  const opts = row.querySelector('.opts[data-correct]')
  if (opts) {
    return {
      kind: 'choice',
      prompt: promptOf(row),
      options: optionsOf(opts),
      correct: optionIndexOf(opts, opts.getAttribute('data-correct')),
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
    // data-order — список value в ПРАВИЛЬНОМ порядке, а не готовые ранги: на
    // A0 value числовые ("1","2",…), на A1 — строковые ("w0","w1",…), и
    // приводить data-val к числу нельзя — на A1 это давало NaN и молча ломало
    // порядок. Ранг чипа — позиция его value в этом списке; сравниваем как
    // строки с обрезкой пробелов, чтобы не зависеть от формата value.
    // Значение, которого в списке нет, даёт -1 — это сырые данные без
    // валидации, невалидную перестановку отбраковывает normalize-task.
    const orderValues = (order.getAttribute('data-order') || '').split(',').map((v) => clean(v))
    return {
      kind: 'order',
      prompt: promptOf(row),
      words: chips.map((c) => clean((c.querySelector('.txt') || c).textContent)),
      order: chips.map((c) => orderValues.indexOf(clean(c.getAttribute('data-val')))),
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

// Разметка курса рассчитана на его собственные скрипты: sayWord озвучивает
// слово, cardAdd кладёт его в словарь курса, slide листает слайдер, sayText
// читает абзац синтезатором. В приложении этих функций нет и не будет, а плеер
// печатает info через dangerouslySetInnerHTML — то есть переносит контрол как
// есть. Такая кнопка жмётся и не делает ничего: мёртвый контрол в уроке хуже,
// чем его отсутствие, поэтому из info-разметки они уходят.
const HANDLER_ATTR = /^on[a-z]+$/i

// Контролы без inline-обработчика курс подключал по id из скрипта
// (переключатель перевода input#trToggle). В приложении они так же мертвы, а
// <label> без своего контрола — подпись к тому, чего нет: убираем вместе.
const DEAD_CONTROLS = 'input, select, textarea'

// Тэги, для которых пустота — норма: они несут смысл сами (картинка, аудио,
// разделитель) или держат каркас таблицы. Их не удаляем, и наличие такого
// потомка делает контейнер непустым.
const KEEPS_MEANING = 'img, audio, video, source, iframe, svg, br, hr, table, thead, tbody, tfoot, tr, td, th, col, colgroup'

const MEDIA = 'img, audio, video, table'
const hasContent = (el) => Boolean(clean(el.textContent) || el.matches(MEDIA) || el.querySelector(MEDIA))
const isDeadControl = (el) =>
  [...el.attributes].some((a) => HANDLER_ATTR.test(a.name)) || el.matches(DEAD_CONTROLS)

/** Мёртвые контролы курса — вместе с подписью-<label>, если она была. */
function stripDeadControls(root) {
  for (const el of [...root.querySelectorAll('*')]) {
    if (!isDeadControl(el)) continue
    const label = el.closest('label')
    ;(label && label !== root ? label : el).remove()
  }
}

/**
 * Пустые контейнеры, которые в курсе наполнял скрипт: карточки слов
 * (div.words#words), слайды грамматики (div.slide#slide, div.dots#dots) и
 * обёртки вокруг них. Без скрипта они остаются пустыми коробками, а их
 * дублирующиеся id (words, slide, dots) ещё и размножаются в DOM приложения,
 * когда узел собран из нескольких стадий. Обходим в обратном порядке
 * документа, поэтому потомки исчезают раньше предков: пустой .slider уходит
 * следом за опустевшими .slide, .snav и .dots.
 */
function stripEmptyContainers(root) {
  for (const el of [...root.querySelectorAll('*')].reverse()) {
    if (el.matches(KEEPS_MEANING) || el.closest('svg') || el.querySelector(KEEPS_MEANING)) continue
    if (clean(el.textContent)) continue
    el.remove()
  }
}

/**
 * Объяснения, карточки слов, грамматическая справка. Они нужны целиком: без
 * них урок превращается в голый тест — поэтому чистка снимает только контролы
 * и опустевшие обёртки, а текст, таблицы, списки и картинки остаются.
 *
 * Отдельно стоящую кнопку аудио дублировать блоком info незачем, но только
 * если она успешно стала блоком audio (extractAudio уже вынул её из дерева).
 * Кнопка с неразобранным onclick — тот же мёртвый контрол курса, что и
 * остальные, и уходит по общему правилу.
 */
function pushInfo(node, blocks) {
  if (node.matches('button.btn-audio') && trackIdOf(node)) return

  const hadContent = hasContent(node)
  const copy = node.cloneNode(true)
  if (!isDeadControl(copy)) {
    stripDeadControls(copy)
    stripEmptyContainers(copy)
    if (hasContent(copy)) {
      blocks.push({ kind: 'info', html: copy.outerHTML.trim() })
      return
    }
  }
  // Содержимое было, но целиком состояло из мёртвых контролов курса. Пустой
  // блок доходит до normalize-task и попадает в сводку потерь (info-empty) —
  // молча исчезать контент урока больше не должен.
  if (hadContent) blocks.push({ kind: 'info', html: '' })
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
