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
    const target = out[targetIdx]
    out[targetIdx] = {
      ...target,
      blocks: [...(target.blocks || []), ...(audioStep.blocks || [])],
    }
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
