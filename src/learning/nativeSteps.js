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

export function tasksToSteps(lesson) {
  const out = []
  for (const t of lesson.tasks || []) {
    const stage = stageOf(t)
    const title = t.title || ''
    switch (t.type) {
      case 'choice':
        if (!Array.isArray(t.options) || !t.answer) break
        out.push({ stage, type: 'choice', title: title || t.sub || 'Выбери верный вариант', prompt: t.word || '', options: t.options, answer: t.answer })
        break

      case 'gap':
        out.push({
          stage,
          type: 'gap',
          title: title || 'Впиши пропущенное',
          before: t.gapBefore || '',
          after: t.gapAfter || '',
          answers: t.answers && t.answers.length ? t.answers : String(t.answer || '').split('|').map((s) => s.trim()).filter(Boolean),
        })
        break

      case 'order':
        // Порядок слов: правильный ответ — сама фраза, банк перемешивает плеер.
        out.push({ stage, type: 'order', title: title || 'Собери предложение', answer: t.answer || (t.words || []).join(' '), words: t.words || String(t.answer || '').split(/\s+/) })
        break

      case 'listen':
        out.push({ stage, type: 'listen', title: title || 'Послушай и выбери', src: (t.tracks && t.tracks[0] && t.tracks[0].src) || null, options: t.options || [], answer: t.answer })
        break

      case 'multi':
        out.push({ stage, type: 'pick', title: title || 'Отметь, что тебе подходит', sub: t.sub || '', options: (t.options || []).map((label) => ({ label })) })
        break

      case 'check':
        out.push({ stage, type: 'checklist', title: title || 'Отметь, чему научился', sub: t.sub || 'Я могу…', items: t.items || [] })
        break

      case 'info':
      default:
        if (t.html) out.push({ stage, type: 'note', title, html: t.html })
        break
    }
  }
  return out
}
