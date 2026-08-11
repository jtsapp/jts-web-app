// Уроки A0/A1 (public/learning/<level>.json) в шаги пошагового плеера.
//
// Эти уровни и так хранят урок как список заданий — по одному на экран, ровно
// как рисует макет, поэтому конвертация идёт в рантайме и не требует
// генерировать сотни файлов: 151 урок A0 и 287 A1 превратились бы в 438 JSON
// ради переименования полей.
//
// Типы заданий уровня → типы шагов:
//   choice → choice     gap  → gap      order → order
//   listen → listen     info → note     check → checklist    multi → pick

// Уровни, чей контент лежит в новом формате и играется пошаговым плеером.
// B2/C1 остаются на старом плеере: у них другой набор типов (chips, watch).
export const STEP_LEVELS = ['a0', 'a1']

export function isStepLevel(level) {
  return STEP_LEVELS.includes(String(level || '').toLowerCase())
}

// «1. Warm-up» → «Warm-up»: номер секции в шапке не нужен, там и так виден
// прогресс.
function stageOf(task) {
  const sec = String(task.sec || '').trim()
  return sec.replace(/^\d+\.\s*/, '') || 'Урок'
}

const textOf = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Подпись задания в разметке урока: инструкция и строка под ней. В исходном
// курсе они лежат ОТДЕЛЬНЫМ блоком перед самим упражнением — на странице это
// читалось как заголовок, а по одному заданию на экран превращалось в пустой
// экран с двумя строчками (реальный баг: «Tick the ones you like» без самих
// вариантов). Поэтому такие блоки не становятся шагом, а подписывают следующий.
const LEAD = /<(div|p)[^>]*class="(?:instruction|subline|byline)"[^>]*>([\s\S]*?)<\/\1>/gi

function leadOf(html) {
  const parts = []
  let rest = String(html || '')
  for (const m of rest.matchAll(LEAD)) parts.push(textOf(m[2]))
  rest = rest.replace(LEAD, ' ')
  // Осталось что-то кроме подписи — это полноценная заметка, не подпись.
  if (!parts.length || textOf(rest) || /<(img|audio|table|ul|ol|details)\b/i.test(rest)) return null
  return { title: parts[0] || '', sub: parts.slice(1).join(' ') }
}

export function tasksToSteps(lesson) {
  const out = []
  // Подпись из предыдущего info-блока: достаётся первому же шагу, у которого
  // нет своего заголовка (см. leadOf).
  let lead = null
  const push = (step, ownTitle, fallbackSub) => {
    if (lead) {
      if (lead.title && !ownTitle) step.title = lead.title
      if (lead.sub && !step.sub) step.sub = lead.sub
      lead = null
    }
    if (!step.sub && fallbackSub) step.sub = fallbackSub
    out.push(step)
  }
  for (const t of lesson.tasks || []) {
    const stage = stageOf(t)
    const title = t.title || ''
    switch (t.type) {
      case 'choice':
        if (!Array.isArray(t.options) || !t.answer) break
        push({ stage, type: 'choice', title: title || t.sub || 'Выбери верный вариант', prompt: t.word || '', options: t.options, answer: t.answer }, !!title)
        break

      case 'gap':
        push(
          {
            stage,
            type: 'gap',
            title: title || 'Впиши пропущенное',
            before: t.gapBefore || '',
            after: t.gapAfter || '',
            answers: t.answers && t.answers.length ? t.answers : String(t.answer || '').split('|').map((s) => s.trim()).filter(Boolean),
          },
          !!title,
        )
        break

      case 'order':
        // Порядок слов: правильный ответ — сама фраза, банк перемешивает плеер.
        push({ stage, type: 'order', title: title || 'Собери предложение', answer: t.answer || (t.words || []).join(' '), words: t.words || String(t.answer || '').split(/\s+/) }, !!title)
        break

      case 'listen':
        push({ stage, type: 'listen', title: title || 'Послушай и выбери', src: (t.tracks && t.tracks[0] && t.tracks[0].src) || null, options: t.options || [], answer: t.answer }, !!title)
        break

      case 'multi':
        push({ stage, type: 'pick', title: title || 'Отметь, что тебе подходит', sub: t.sub || '', options: (t.options || []).map((label) => ({ label })) }, !!title)
        break

      case 'check':
        push({ stage, type: 'checklist', title: title || 'Отметь, чему научился', sub: t.sub || '', items: t.items || [] }, !!title, 'Я могу…')
        break

      case 'info':
      default: {
        if (!t.html) break
        // Подпись к следующему заданию — не отдельный экран.
        const l = leadOf(t.html)
        if (l) {
          lead = lead ? { title: lead.title || l.title, sub: [lead.sub, l.sub].filter(Boolean).join(' ') } : l
          break
        }
        // Плеер без звука: экстрактор оставил от блока только подпись дорожки
        // («Track 6.2 … Original coursebook recording»), сам <audio> потерян.
        // Экран с одной этой строкой студенту бесполезен.
        if (/class="player"/.test(t.html) && !/<audio|\.mp3/.test(t.html)) break
        if (!textOf(t.html) && !/<img\b/i.test(t.html)) break
        push({ stage, type: 'note', title, html: t.html }, !!title)
        break
      }
    }
  }
  return out
}
