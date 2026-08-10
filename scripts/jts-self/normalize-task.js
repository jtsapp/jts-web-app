// Сырой блок урока → задание в формате нативного плеера «Обучения»
// (public/learning/<level>.json). Формат менять нельзя: его читают
// LessonPlayer.jsx и уже выпущенные уровни a2–c1.

// Аудио уроков уже опубликовано админкой вместе с бандлом уровня и отдаётся
// публично, поэтому треки не выгружаются, а адресуются по месту.
const AUDIO_BASE = 'https://files-dev.justtostudy.kz/development/course-catalog'

function trackUrl(level, file) {
  return `${AUDIO_BASE}/${level}/audio/${file}`
}

// Причины, по которым блок не стал заданием. Их считает CLI экстрактора и
// показывает по итогам прогона: раньше normalizeBlock молча возвращал null, и
// весь уровень A1 без единого задания choice дожил до финального ревью.
const DROP = {
  choiceNoAnswer: 'choice-no-answer',
  selectAnswerOutside: 'select-answer-outside-options',
  gapNoAnswer: 'gap-no-answer',
  multiNoAnswer: 'multi-no-answer',
  orderTooShort: 'order-too-short',
  orderNotPermutation: 'order-not-permutation',
  audioNoTrack: 'audio-no-track',
  infoEmpty: 'info-empty',
  unknownKind: 'unknown-kind',
}

// Поля title и sub у заданий self-курсов намеренно пустые: инструкции урока
// («Listen. Choose the word you hear.») переносятся отдельными info-блоками
// перед вопросами — так их писала методика. Дублировать инструкцию ещё и в
// заголовок каждого экрана значило бы придумать заголовок за автора курса.
// Кикер (sec) при этом нумерованный, как на выпущенных уровнях, — номер стадии
// проставляет build-nodes.
function normalizeBlock(block, ctx) {
  const base = { sec: ctx.sec || '', title: '', sub: '' }
  // Отброшенный блок — это потерянный кусок урока, поэтому у каждого выхода в
  // null есть причина, и она уходит наверх (ctx.onDrop не обязателен: модуль
  // остаётся вызываемым и из тестов, и из другого конвейера).
  const drop = (reason) => {
    if (typeof ctx.onDrop === 'function') ctx.onDrop(reason, block)
    return null
  }

  switch (block.kind) {
    case 'choice': {
      // Проверяем именно границы массива, а не истинность значения: вариант с
      // пустым текстом — валидный вариант курса, а не отсутствие ответа.
      const i = block.correct
      if (!Number.isInteger(i) || i < 0 || i >= block.options.length) return drop(DROP.choiceNoAnswer)
      return { ...base, type: 'choice', visual: null, word: block.prompt, options: block.options, answer: block.options[i], two: block.options.length === 2, why: block.why || '' }
    }

    case 'select': {
      if (!block.options.includes(block.answer)) return drop(DROP.selectAnswerOutside)
      return { ...base, type: 'choice', visual: null, word: block.prompt, options: block.options, answer: block.answer, two: block.options.length === 2, why: block.why || '' }
    }

    case 'gap': {
      const answers = String(block.answer || '').split('|').map((s) => s.trim()).filter(Boolean)
      if (!answers.length) return drop(DROP.gapNoAnswer)
      // Пробелы вокруг пропуска рисует не CSS, а сама строка: плеер печатает
      // gapBefore, поле и gapAfter подряд.
      return { ...base, type: 'gap', gapBefore: block.before ? block.before + ' ' : '', gapAfter: block.after ? ' ' + block.after : '', answers, why: block.why || '' }
    }

    case 'multi': {
      // Хотя бы одно значение data-multi, не найденное среди кнопок, делает
      // эталонный набор неполным — и студент, отметивший всё верно, получил бы
      // «неверно». Такой блок отбрасываем целиком, а не чиним частично.
      const indexes = block.correct || []
      const valid = indexes.every((i) => Number.isInteger(i) && i >= 0 && i < block.options.length)
      const answer = [...new Set(indexes)].sort((a, b) => a - b)
      if (!valid || !answer.length) return drop(DROP.multiNoAnswer)
      return { ...base, type: 'multi', word: block.prompt, options: block.options, answer, why: block.why || '' }
    }

    case 'order': {
      if (block.words.length < 2 || block.words.length !== block.order.length) return drop(DROP.orderTooShort)
      // block.order — позиция каждого чипа в списке data-order (её вычислил
      // collectLesson). Корректный ответ существует только если эти позиции
      // образуют полную перестановку 0..n-1 без пропусков и повторов; иначе
      // где-то есть чип со значением, отсутствующим в data-order, или два
      // чипа с одинаковым значением — досортировать такой набор нельзя, и
      // тихая сортировка мусора выдала бы правдоподобное, но неверное
      // предложение как «правильный ответ».
      const ranks = [...block.order].sort((a, b) => a - b)
      const isPermutation = ranks.every((rank, i) => rank === i)
      if (!isPermutation) return drop(DROP.orderNotPermutation)

      const answer = block.words.map((w, i) => [block.order[i], w]).sort((a, b) => a[0] - b[0]).map(([, w]) => w)
      return { ...base, type: 'order', word: block.prompt, words: block.words, answer, why: block.why || '' }
    }

    case 'audio': {
      const file = ctx.trackFile(block.trackId)
      if (!file) return drop(DROP.audioNoTrack)
      return { ...base, type: 'listen', tracks: [{ src: trackUrl(ctx.level, file), label: block.label || '' }] }
    }

    case 'info': {
      const html = String(block.html || '').trim()
      if (!html) return drop(DROP.infoEmpty)
      return { ...base, type: 'info', html }
    }

    default:
      return drop(DROP.unknownKind)
  }
}

module.exports = { normalizeBlock, trackUrl, DROP }
