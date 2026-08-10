// Сырой блок урока → задание в формате нативного плеера «Обучения»
// (public/learning/<level>.json). Формат менять нельзя: его читают
// LessonPlayer.jsx и уже выпущенные уровни a2–c1.

// Аудио уроков уже опубликовано админкой вместе с бандлом уровня и отдаётся
// публично, поэтому треки не выгружаются, а адресуются по месту.
const AUDIO_BASE = 'https://files-dev.justtostudy.kz/development/course-catalog'

function trackUrl(level, file) {
  return `${AUDIO_BASE}/${level}/audio/${file}`
}

function normalizeBlock(block, ctx) {
  const base = { sec: ctx.sec || '', title: '', sub: '' }

  switch (block.kind) {
    case 'choice': {
      const answer = block.options[block.correct]
      if (!answer) return null
      return { ...base, type: 'choice', visual: null, word: block.prompt, options: block.options, answer, two: block.options.length === 2, why: block.why || '' }
    }

    case 'select': {
      if (!block.options.includes(block.answer)) return null
      return { ...base, type: 'choice', visual: null, word: block.prompt, options: block.options, answer: block.answer, two: block.options.length === 2, why: block.why || '' }
    }

    case 'gap': {
      const answers = String(block.answer || '').split('|').map((s) => s.trim()).filter(Boolean)
      if (!answers.length) return null
      // Пробелы вокруг пропуска рисует не CSS, а сама строка: плеер печатает
      // gapBefore, поле и gapAfter подряд.
      return { ...base, type: 'gap', gapBefore: block.before ? block.before + ' ' : '', gapAfter: block.after ? ' ' + block.after : '', answers, why: block.why || '' }
    }

    case 'multi': {
      const answer = [...new Set(block.correct)].filter((i) => i >= 0 && i < block.options.length).sort((a, b) => a - b)
      if (!answer.length) return null
      return { ...base, type: 'multi', word: block.prompt, options: block.options, answer, why: block.why || '' }
    }

    case 'order': {
      if (block.words.length < 2 || block.words.length !== block.order.length) return null
      // block.order — позиция каждого чипа в списке data-order (её вычислил
      // collectLesson). Корректный ответ существует только если эти позиции
      // образуют полную перестановку 0..n-1 без пропусков и повторов; иначе
      // где-то есть чип со значением, отсутствующим в data-order, или два
      // чипа с одинаковым значением — досортировать такой набор нельзя, и
      // тихая сортировка мусора выдала бы правдоподобное, но неверное
      // предложение как «правильный ответ».
      const ranks = [...block.order].sort((a, b) => a - b)
      const isPermutation = ranks.every((rank, i) => rank === i)
      if (!isPermutation) return null

      const answer = block.words.map((w, i) => [block.order[i], w]).sort((a, b) => a[0] - b[0]).map(([, w]) => w)
      return { ...base, type: 'order', word: block.prompt, words: block.words, answer, why: block.why || '' }
    }

    case 'audio': {
      const file = ctx.trackFile(block.trackId)
      if (!file) return null
      return { ...base, type: 'listen', tracks: [{ src: trackUrl(ctx.level, file), label: block.label || '' }] }
    }

    case 'info': {
      const html = String(block.html || '').trim()
      if (!html) return null
      return { ...base, type: 'info', html }
    }

    default:
      return null
  }
}

module.exports = { normalizeBlock, trackUrl }
