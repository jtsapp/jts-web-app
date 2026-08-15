// Живой урок → шаги CourseStepPlayer.
//
// Онлайн-урок в макете (Figma «pitch JTS» → Уроки → Онлайн-уроки) — это та же
// очередь экранов, что и в «Обучении»: одно задание на экран, прогресс сверху,
// одна кнопка снизу. Плеер для неё уже есть — src/learning/CourseStepPlayer.jsx,
// поэтому здесь только перевод данных, а не второй движок.
//
// Источник — JSON живого урока (loadLiveLesson / loadCatalogLesson): урок
// состоит из шагов, шаг — из блоков, практика внутри блока — из вопросов.
// Плеер же ждёт плоскую очередь: один вопрос = один экран. Разворачиваем.
//
// Блок `banner` пропускаем: это декоративная плашка-заглушка документа урока
// («Место для баннера»), в очереди экранов она стала бы экраном без задания.
//
// Подряд идущие `info` склеиваются в ОДИН экран. Экстрактор урока каталога
// режет тело упражнения по прямым детям `.ex-body`, поэтому инструкция,
// подсказка и сама разметка приезжают отдельными блоками: в реальном уроке
// (A2, L01) их 88 на семь шагов, сериями до семнадцати подряд. Без склейки
// урок превращался в 88 экранов, где «1 · Match each word to its meaning.»
// занимает отдельный экран с кнопкой «Продолжить», оторванный от упражнения,
// к которому относится. Та же склейка и по той же причине уже сделана в
// документе урока (groupBlocks в LessonContent).

// Предложение с пропуском: в данных урока половинки лежат отдельно
// (`gapBefore` / `gapAfter`), плеер для типа `gap` ждёт их как `before`/`after`
// и сам склеивает через `___` (см. gapSentence). Для `chips` пропуск нужен
// прямо в тексте вопроса — там вариант выбирается кнопкой, а не печатается.
function gapPrompt(question) {
  const before = String(question?.gapBefore || '').trim()
  const after = String(question?.gapAfter || '').trim()
  return `${before} ___ ${after}`.replace(/\s+/g, ' ').trim()
}

// Правило урока карточкой. Таблица и список форм приезжают структурой, а
// карточка правила в плеере (`note`) рендерит html — собираем разметку здесь,
// чтобы плеер не знал про формы блока `theory`.
function theoryHtml(block) {
  const parts = []
  if (block.text) parts.push(`<p>${block.text}</p>`)

  const forms = block.forms || []
  if (forms.length) {
    const rows = forms
      .map((f) => `<li>${f.label} — <b${f.accent ? ' class="is-accent"' : ''}>${f.example}</b></li>`)
      .join('')
    parts.push(`<ul class="cp-note__forms">${rows}</ul>`)
  }

  const table = block.table || []
  if (table.length) {
    const rows = table.map((r) => `<tr><td>${r.kind}</td><td>${r.example}</td></tr>`).join('')
    parts.push(`<table class="cp-note__table"><tbody>${rows}</tbody></table>`)
  }

  // Типичная ошибка идёт последней и отдельной плашкой — в макете она визуально
  // отбита от самого правила.
  if (block.mistake) parts.push(`<p class="cp-note__mistake">${block.mistake}</p>`)
  return parts.join('')
}

// Один вопрос практики → один экран плеера. Возвращает null для типов, которых
// плеер не знает: неизвестный вопрос лучше пропустить, чем показать пустой
// экран без задания и без кнопки.
function questionStep(question, block, stage) {
  const base = { stage, title: block.title || '' }

  switch (question.type) {
    case 'choice':
      return { ...base, type: 'choice', prompt: question.prompt || '', options: question.options || [], answer: question.answer }

    // `chips` — выбор варианта из банка в пропуск. У плеера отдельного типа под
    // это нет, но это ровно `choice`: варианты те же кнопки, ответ один. Разница
    // только в том, что вопрос — предложение с пропуском.
    case 'chips':
      return { ...base, type: 'choice', prompt: gapPrompt(question), options: question.bank || [], answer: question.answer }

    case 'gap':
      return { ...base, type: 'gap', before: question.gapBefore || '', after: question.gapAfter || '', answers: question.answers || [] }

    case 'match':
      return { ...base, type: 'match', title: question.prompt || block.title || '', pairs: question.pairs || [] }

    // Живой пример разговора (Figma, Speaking → 4065:28707). Одна реплика
    // собеседника = один экран: в макете следующий ход диалога нарисован
    // отдельным фреймом, а не дописывается в ту же ленту.
    case 'dialog':
      return {
        ...base,
        type: 'dialog',
        title: question.prompt || block.title || '',
        bubbles: question.bubbles || [],
        options: question.options || [],
      }

    default:
      return null
  }
}

/**
 * Разворачивает урок в очередь экранов для CourseStepPlayer.
 *
 * `stage` каждого экрана — название топика урока (Warm-up / Vocabulary / …):
 * именно его показывает жирной строкой шапка плеера, а справа тот же список
 * подсвечивает активный пункт в «Топиках урока». Если у шага нет `topicId` или
 * топик не найден — падаем на заголовок самого шага, чтобы шапка не пустовала.
 */
export function liveLessonSteps(lesson) {
  const topics = lesson?.topics || []
  const titleByTopic = new Map(topics.map((topic) => [topic.id, topic.title]))
  const out = []

  for (const step of lesson?.steps || []) {
    const stage = titleByTopic.get(step.topicId) || step.title || ''
    // id исходного шага урока. Плеер знает только свой плоский индекс, а
    // маршрут слева, бегунки учителя и трансляция step-progress живут на шагах
    // урока — без этой ссылки экран плеера не с чем сопоставить.
    const stepId = step.id ?? null
    // Серия info-блоков, ещё не выложенная экраном (см. комментарий выше).
    let infoRun = []

    const flushInfo = () => {
      if (!infoRun.length) return
      out.push({
        stage,
        stepId,
        type: 'note',
        // Заголовок берём у первого блока серии, у которого он есть: остальные
        // блоки серии — продолжение того же упражнения.
        title: infoRun.find((b) => b.title)?.title || '',
        html: infoRun.map((b) => b.html || '').join(''),
      })
      infoRun = []
    }

    for (const block of step.blocks || []) {
      if (block.type === 'info') {
        infoRun.push(block)
        continue
      }
      flushInfo()

      if (block.type === 'theory') {
        out.push({ stage, stepId, type: 'note', title: block.title || '', html: theoryHtml(block) })
      } else if (block.type === 'practice') {
        for (const question of block.questions || []) {
          const made = questionStep(question, block, stage)
          if (made) out.push({ ...made, stepId })
        }
      }
    }

    // Серия могла закончиться вместе с шагом — тогда её никто не выложил.
    // Склейка не переносится на следующий шаг: там своя стадия и свой экран.
    flushInfo()
  }

  return out
}

/**
 * Топик, к которому относится экран с индексом `index`.
 *
 * Правая колонка подсвечивает текущий пункт «Топиков урока», а плеер знает
 * только свой плоский индекс — сопоставляем через `stage`, по которому шаг и
 * собирался. Возвращает id топика или null.
 */
export function topicIdAtStep(lesson, steps, index) {
  const stage = steps?.[index]?.stage
  if (!stage) return null
  const topic = (lesson?.topics || []).find((it) => it.title === stage)
  return topic ? topic.id : null
}
