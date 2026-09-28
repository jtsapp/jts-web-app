/**
 * Отрывок внутри дорожки: остановить там, где он кончается.
 *
 * Конвертер курса записывает границы отрывка медиа-фрагментом прямо в `src` —
 * `Track_2.4.mp3#t=3.77,19.74`. Начало браузеры соблюдают, а КОНЕЦ — нет: для
 * обычного `<audio src="…#t=a,b">` Chrome перематывает на `a` и играет до конца
 * файла. На уроке это выглядит так, как и пожаловались: «несколько дорожек,
 * каждая начинается с правильного момента, но может продолжаться до конца».
 *
 * Поэтому конец соблюдаем сами, по ходу воспроизведения. Правило одно на обе
 * стороны урока — тот же файл есть у преподавателя
 * (web-admin/src/app/core/utils/audio-clip.util.ts).
 */

/**
 * Границы из адреса. Формат Media Fragments: `#t=начало` или `#t=начало,конец`,
 * секунды с дробной частью.
 *
 * @returns {{start:number, end:number|null}|null} null — фрагмента нет или он не
 *          разбирается: тогда дорожка играет как обычно, целиком.
 */
export function parseAudioClip(src) {
  const match = /#t=([\d.]*)(?:,([\d.]+))?/.exec(String(src ?? ''))
  if (!match) return null
  const start = match[1] === '' ? 0 : Number(match[1])
  const end = match[2] === undefined ? null : Number(match[2])
  if (!Number.isFinite(start) || (end !== null && !Number.isFinite(end))) return null
  // Конец раньше начала — разметка курса сломана; играем целиком, но с начала.
  if (end !== null && end <= start) return { start, end: null }
  return { start, end }
}

/**
 * Задание слушать НЕСКОЛЬКИХ говорящих, а не один отрывок.
 *
 * Конвертер иногда кладёт на верхний плеер границы первой кнопки — тогда
 * bindAudioClips обрывает запись после первого спикера, хотя в задании
 * «Listen to the three speakers». По тексту карточки отличаем этот случай от
 * обычного «послушай этот кусок дорожки».
 */
export function isMultiSpeakerListenText(text) {
  const s = String(text || '')
  if (/\b(?:two|three|four|five|six|\d+)\s+speakers?\b/i.test(s)) return true
  if (/(?:троих|тр[её]х|двух|двоих)\s+(?:спикер|говор)/i.test(s)) return true
  return /\bspeaker\s*1\b/i.test(s) && /\bspeaker\s*2\b/i.test(s)
}

/**
 * Убрать конец отрывка, начало оставить: запись доигрывает до конца файла.
 *
 * `#t=3.5,28` → `#t=3.5`. Без конца bindAudioClips больше не останавливает.
 */
export function dropAudioClipEnd(src) {
  const s = String(src ?? '')
  const hashAt = s.indexOf('#')
  if (hashAt < 0) return s
  const clip = parseAudioClip(s)
  if (!clip || clip.end === null) return s
  const base = s.slice(0, hashAt)
  return clip.start > 0 ? `${base}#t=${clip.start}` : base
}

const LISTEN_CARD = '.lw-practice, .csr-practice, .lw-info__item, .csr-info, .lw-card'

function playsWholeMultiSpeaker(audio) {
  if (!audio || audio.tagName !== 'AUDIO' || typeof audio.closest !== 'function') return false
  const card = audio.closest(LISTEN_CARD)
  if (!card || !isMultiSpeakerListenText(card.textContent)) return false
  return card.querySelector('audio') === audio
}

/**
 * Держать воспроизведение в границах отрывка.
 *
 * Слушатели вешаются в фазе перехвата на общий контейнер: медиа-события не
 * всплывают, а сами `<audio>` приезжают вместе с HTML курса и пересоздаются при
 * каждой перерисовке — подписываться на каждый пришлось бы заново.
 *
 * @returns {() => void} отписка.
 */
export function bindAudioClips(root) {
  if (!root) return () => {}

  const clipOf = (audio) => {
    if (!audio || audio.tagName !== 'AUDIO') return null
    return parseAudioClip(audio.currentSrc || audio.getAttribute('src'))
  }

  const onTimeUpdate = (event) => {
    const audio = event.target
    if (playsWholeMultiSpeaker(audio)) return
    const clip = clipOf(audio)
    if (!clip || clip.end === null) return
    if (audio.currentTime >= clip.end) {
      audio.pause()
      // Возвращаем на начало отрывка, а не оставляем на его конце: следующее
      // нажатие «играть» должно повторить фразу, а не упереться в край.
      audio.currentTime = clip.start
    }
  }

  const onPlay = (event) => {
    const audio = event.target
    if (playsWholeMultiSpeaker(audio)) return
    const clip = clipOf(audio)
    if (!clip || clip.end === null) return
    // Нажали «играть», стоя вне отрывка — начинаем с его начала: играть чужой
    // кусок дорожки смысла нет.
    if (audio.currentTime < clip.start || audio.currentTime >= clip.end) {
      audio.currentTime = clip.start
    }
  }

  root.addEventListener('timeupdate', onTimeUpdate, true)
  root.addEventListener('play', onPlay, true)
  return () => {
    root.removeEventListener('timeupdate', onTimeUpdate, true)
    root.removeEventListener('play', onPlay, true)
  }
}
