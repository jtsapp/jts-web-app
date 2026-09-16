/**
 * Варианты ответа, оставшиеся в info-разметке сырыми кнопками `.opt`.
 *
 * Курс отдаёт выбор ответа как `<button class="opt">`, а обработчики к ним
 * живут в JS самого курса, который конвертация выбрасывает. Экстрактор читает
 * такие кнопки, только когда они лежат в известном ему контейнере (`.mcq`,
 * `.pick-q`); всё остальное оседало в HTML info-блока, где CSS честно гасит их
 * `pointer-events: none` — плашка выглядит вариантом ответа, но не нажимается.
 * Это и есть жалоба «кнопки ответов не нажимаются у студента»: у преподавателя
 * «работает» другое — он ставит ответ ученику своей правкой ответа, а не этими
 * же кнопками.
 *
 * Поднимаем их в настоящие вопросы практики — тот же приём, которым уже спасены
 * `<select>` (hoistSelectQuestions) и чипы порядка (hoistOrderQuestions).
 * Заново регистрировать уровни в админке при этом не нужно.
 */
function textOf(el) {
  return String(el?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlHasContent(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0
}

/** Формулировка: текст карточки без самих вариантов и служебных значков. */
function promptFor(container) {
  const qEl = container.querySelector('.q')
  const holder = qEl || container.closest('.row, .line, li, .card, .body, p') || container.parentElement
  if (!holder) return ''
  const clone = holder.cloneNode(true)
  clone.querySelectorAll?.('.opts, .opt, .num, .say, .why, .rev')?.forEach((el) => el.remove())
  return textOf(clone)
}

/**
 * Один блок вариантов → вопрос.
 *
 * Тип выбираем по разметке, а не по желанию: `data-correct` есть — это проверяемый
 * выбор (`choice`, несколько верных — `multi`); нет — опрос про себя (`pick`),
 * где верного ответа не существует и засчитывается сам факт выбора. Придумать
 * ключ проверки там, где его не было, значило бы отмечать ученику ошибки на
 * вопросе «что тебе нравится».
 */
/**
 * Слово, которое ученик должен услышать.
 *
 * Задание «послушай и выбери слово» держит его не в тексте: в разметке курса это
 * кнопка `sayWord('answer')`, конвертация превращает её в маркер `data-say` на
 * самом вопросе или в пустой `.say[data-say]` рядом с вариантами.
 *
 * Здесь вопрос собирается заново — и раньше маркер не читался вовсе. Кнопки
 * приезжали, звук нет, и задание становилось неотвечаемым: выбрать слово на слух,
 * не услышав его, нельзя.
 *
 * Тот же разбор, слово в слово, делает сторона преподавателя
 * (web-admin hoist-choice-options.ts): разъедься они — живой урок сведёт вопросы
 * по questionId и покажет сторонам разное.
 */
function sayOf(container) {
  const own = container.getAttribute('data-say')?.trim()
  if (own) return own
  // Голые `.opts`: маркер лежит не на них, а рядом, в той же строке задания.
  const holder =
    container.closest('.mcq, .multi-q, .row, .line, li, .card, .body') || container.parentElement
  return holder?.querySelector('[data-say]')?.getAttribute('data-say')?.trim() || undefined
}

export function choiceFromOptions(container, id) {
  const buttons = Array.from(container.querySelectorAll('.opt'))
  if (buttons.length < 2) return null

  const options = [...new Set(buttons.map(textOf).filter(Boolean))]
  if (options.length < 2) return null

  const correct = buttons.filter((b) => b.hasAttribute('data-correct')).map(textOf).filter(Boolean)
  const prompt = promptFor(container)
  const multiple = container.hasAttribute('data-multiple')
  const say = sayOf(container)
  const withSay = say ? { say } : {}

  // prompt пишем всегда, даже пустой: тот же объект собирает сторона
  // преподавателя (hoist-choice-options.ts), и расходиться формой они не должны.
  if (correct.length > 1) {
    return { id, type: 'multi', prompt, options, answers: correct, ...withSay }
  }
  if (correct.length === 1) {
    return { id, type: 'choice', prompt, options, answer: correct[0], ...withSay }
  }
  return { id, type: 'pick', prompt, options, ...(multiple ? { multiple: true } : {}), ...withSay }
}

function extractFromHtml(html, stepId, nextIndex) {
  if (typeof DOMParser === 'undefined' || !html) return { html, questions: [] }
  // Дешёвый отказ: без класса `opt` разбирать нечего.
  if (!/\bopt\b/i.test(html)) return { html, questions: [] }

  const doc = new DOMParser().parseFromString(`<div id="jts-hoist">${html}</div>`, 'text/html')
  const root = doc.getElementById('jts-hoist') || doc.body
  const questions = []

  // Сначала именованные контейнеры, потом голые `.opts`: разбирая наоборот, мы
  // сняли бы варианты изнутри `.pick-q` и потеряли его формулировку.
  const containers = [
    ...Array.from(root.querySelectorAll('.pick-q, .mcq, .multi-q')),
    ...Array.from(root.querySelectorAll('.opts')).filter((el) => !el.closest('.pick-q, .mcq, .multi-q')),
  ]

  for (const el of containers) {
    const question = choiceFromOptions(el, `${stepId}-c${nextIndex()}`)
    if (!question) continue
    questions.push(question)
    // Убираем ровно контейнер вариантов: текст вокруг него — условие задания,
    // и вырезать его вместе с кнопками значило бы стереть сам вопрос.
    el.remove()
  }

  return { html: root.innerHTML, questions }
}

function hoistBlocks(blocks, stepId) {
  const out = []
  let n = 0
  const nextIndex = () => n++

  for (const block of blocks || []) {
    const html = block?.html
    if (!html) {
      out.push(block)
      continue
    }

    if (block.type === 'practice') {
      const extracted = extractFromHtml(html, stepId, nextIndex)
      if (!extracted.questions.length) {
        out.push(block)
        continue
      }
      out.push({
        ...block,
        html: extracted.html,
        questions: [...(block.questions || []), ...extracted.questions],
      })
      continue
    }

    if (block.type === 'info' || block.type === 'grammar_concept') {
      const extracted = extractFromHtml(html, stepId, nextIndex)
      if (!extracted.questions.length) {
        out.push(block)
        continue
      }
      if (htmlHasContent(extracted.html)) {
        out.push({ ...block, html: extracted.html })
      }
      out.push({
        type: 'practice',
        ...(block.title ? { title: block.title } : {}),
        questions: extracted.questions,
      })
      continue
    }

    out.push(block)
  }

  return out
}

export function hoistChoiceOptions(lesson) {
  if (!lesson?.steps) return lesson
  return {
    ...lesson,
    steps: lesson.steps.map((step) => ({
      ...step,
      blocks: hoistBlocks(step.blocks, step.id || 's'),
    })),
  }
}
