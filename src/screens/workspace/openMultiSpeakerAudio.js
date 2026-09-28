import { dropAudioClipEnd, isMultiSpeakerListenText } from './audioClip.js'

/**
 * Верхнему плееру «Listen to three speakers» — всю запись, не первый отрывок.
 *
 * Уже сохранённый content_json курса часто несёт на `block.audio` границы
 * первой кнопки (`Track_2.6.mp3#t=3.5,28`). Плеер останавливается после
 * первого говорящего, хотя задание — трое, и длительность файла при этом
 * честные 2–3 минуты. Меняем только поле `audio` (оно не входит в адрес
 * карточки), html не трогаем.
 *
 * Вторая копия: web-admin, open-multi-speaker-audio.ts.
 */
export function openMultiSpeakerAudio(steps) {
  return (steps || []).map((step) => {
    if (!step?.blocks?.length) return step
    const blocks = step.blocks.map(openBlockAudio)
    if (blocks.every((block, i) => block === step.blocks[i])) return step
    return { ...step, blocks }
  })
}

function openBlockAudio(block) {
  const src = block?.audio?.src
  if (!src || !isMultiSpeakerListenText(listenText(block))) return block
  const next = dropAudioClipEnd(src)
  if (next === src) return block
  return { ...block, audio: { ...block.audio, src: next } }
}

function listenText(block) {
  const prompts = (block.questions || []).map((q) => q.prompt || '').join('\n')
  return [block.instruction, block.title, prompts].filter(Boolean).join('\n')
}
