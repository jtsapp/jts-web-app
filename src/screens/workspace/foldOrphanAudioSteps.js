/**
 * Хвостовой шаг «Audio» — артефакт конвертации курса: дорожка не привязалась к
 * плееру и уехала отдельным пунктом маршрута. Склеиваем с Practice/Listening,
 * чтобы уже сохранённые уроки в каталоге не требовали перерегистрации.
 */
export function foldOrphanAudioSteps(steps) {
  if (!steps?.length) return steps || []
  const out = [...steps]
  while (out.length >= 2 && isTrailingAudioDump(out[out.length - 1])) {
    const audioStep = out.pop()
    const targetIdx = findAudioTargetStepIndex(out)
    if (targetIdx < 0) {
      out.push(audioStep)
      break
    }
    out[targetIdx] = placeAudioBlocks(out[targetIdx], audioStep.blocks || [])
  }
  return out.map((step, index) => ({ ...step, order: index + 1 }))
}

function isTrailingAudioDump(step) {
  const title = (step.title || '').trim().toLowerCase()
  const id = String(step.id || '').toLowerCase()
  if (title !== 'audio' && id !== 's-audio') return false
  const blocks = step.blocks || []
  if (!blocks.length) return false
  if (!blocks.every((b) => b.type === 'info')) return false
  return blocks.some((b) => b.type === 'info' && /<audio\b/i.test(b.html || ''))
}

function findAudioTargetStepIndex(steps) {
  const prefer = /listen|practice|listening/i
  for (let i = steps.length - 1; i >= 0; i--) {
    if (prefer.test(steps[i].title || '') || prefer.test(steps[i].tag || '')) return i
  }
  for (let i = steps.length - 1; i >= 0; i--) {
    const title = (steps[i].title || '').toLowerCase()
    if (title.includes('you can now')) continue
    if ((steps[i].blocks || []).some((b) => b.type === 'checklist')) continue
    return i
  }
  return steps.length - 1
}

/**
 * Каждую дорожку ставим к СВОЕМУ упражнению, а не всё скопом в конец шага.
 *
 * Дамп приходит подписанным именем файла (`<b>Track_1.3.mp3</b>`), а задание,
 * ради которого дорожка записана, почти всегда называет её номер в тексте
 * («Listen to Track 1.3»). По этому номеру и ставим плеер сразу после нужного
 * блока. Это и есть жалоба «в некоторых заданиях аудио не там, где само
 * упражнение»: раньше все дорожки шага складывались под последний блок, и до
 * своего задания ученик доскроллить их не мог.
 *
 * Не нашли, к чему привязать, — оставляем в конце, как было: плеер внизу шага
 * хуже, чем плеер у задания, но лучше, чем плеер, приклеенный не туда.
 */
function placeAudioBlocks(target, audioBlocks) {
  const blocks = [...(target.blocks || [])]
  for (const audio of audioBlocks) {
    const at = findReferenceBlockIndex(blocks, trackNeedles(audio))
    if (at < 0) blocks.push(audio)
    else blocks.splice(at + 1, 0, audio)
  }
  return { ...target, blocks }
}

/** «Track_1.3.mp3» → ['1.3', '1_3']: номер записан то точкой, то подчёркиванием. */
function trackNeedles(block) {
  const name = String(block?.html || '').match(/<b>([^<]+)<\/b>/i)?.[1] || ''
  const num = name.replace(/\.[a-z0-9]+$/i, '').match(/(\d+[._]\d+)/)?.[1]
  if (!num) return []
  return [num.replace(/_/g, '.'), num.replace(/\./g, '_')]
}

function findReferenceBlockIndex(blocks, needles) {
  if (!needles.length) return -1
  for (let i = blocks.length - 1; i >= 0; i--) {
    const text = blockText(blocks[i])
    if (!text) continue
    // Уже поставленный плеер той же дорожки не считаем ссылкой на неё — иначе
    // вторая дорожка прицепилась бы к первой.
    if (/<audio/i.test(blocks[i].html || '')) continue
    if (needles.some((n) => text.includes(n))) return i
  }
  return -1
}

function blockText(block) {
  if (!block) return ''
  const raw = block.type === 'info' || block.html ? String(block.html || '') : JSON.stringify(block)
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
}
