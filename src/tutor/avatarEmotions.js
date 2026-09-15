// Словарь эмоций аватара тьютора: ключ → готовый рендер из Figma.
//
// Лицо — картинка, а не рисунок в коде. Источник — component set «Speaking
// Buddy» (файл HbXfjz582soaO4UzzbwBBa, node 5080:1807, страница «АВАТАР
// ТЬЮТОРА»): каждая карточка выгружена exportAsync PNG ×2 и уложена на общий
// холст так, что центр рамки 428×428 у всех 13 в одной точке — иначе при смене
// эмоции маскот прыгал бы (у карточек разный вылет свечения и значков).
// Раньше лицо рисовал canvas-движок по числам «похоже на макет», и это
// оказалось не то: наклон тела, подложки, свечение и значки руками не
// совпадали. Меняется карточка в Figma — перевыгружай картинку, а не правь код.
//
// label — подпись для aria-label, ровно как вариант называется в макете.
export const EMOTIONS = {
  idle: { label: 'Дефолт', src: '/tutor/buddy/idle.webp' },
  confused: { label: 'Не понимает', src: '/tutor/buddy/confused.webp' },
  talking: { label: 'Говорит', src: '/tutor/buddy/talking.webp' },
  listening: { label: 'Слушает', src: '/tutor/buddy/listening.webp' },
  thinking: { label: 'Думает', src: '/tutor/buddy/thinking.webp' },
  happy: { label: 'Счастлив', src: '/tutor/buddy/happy.webp' },
  celebrate: { label: 'Радуется', src: '/tutor/buddy/celebrate.webp' },
  angry: { label: 'Злится', src: '/tutor/buddy/angry.webp' },
  sleepy: { label: 'Скука', src: '/tutor/buddy/sleepy.webp' },
  gloat: { label: 'Соркастичен', src: '/tutor/buddy/gloat.webp' },
  surprised: { label: 'Удивление', src: '/tutor/buddy/surprised.webp' },
  sympathy: { label: 'Сочувствие', src: '/tutor/buddy/sympathy.webp' },
  rage: { label: 'Ярость', src: '/tutor/buddy/rage.webp' },
}

// Имя от агента (топик "mood") → ключ картинки. Именно Map, а не литерал:
// у литерала есть цепочка прототипов, и MOOD_EMOTION['constructor'] вернул бы
// функцию Object — то есть «незнакомое» имя прошло бы проверку.
//
// Пять первых имён — исторический словарь агента. Их нельзя выбрасывать даже
// после расширения: задеплоенный воркер обновляется отдельно от приложения
// (`lk agent deploy` вручную), поэтому какое-то время прод шлёт старый набор.
//
// У praise/encourage/curious/correcting/disgust своей карточки в макете нет —
// агент их по-прежнему шлёт, поэтому они показывают ближайшую по смыслу.
const MOOD_EMOTION = new Map([
  ['anger', 'angry'],
  ['rage', 'rage'],
  ['disgust', 'angry'],
  ['joy', 'happy'],
  ['sadness', 'sympathy'],
  ['gloat', 'gloat'],
  ['praise', 'happy'],
  ['encourage', 'happy'],
  ['correcting', 'thinking'],
  ['surprised', 'surprised'],
  ['curious', 'surprised'],
  ['confused', 'confused'],
  ['celebrate', 'celebrate'],
])

/**
 * Тег эмоции от агента → ключ картинки. Незнакомое имя → null (экран не ломаем).
 *
 * Сила 3 у радости — это уже не улыбка, а праздник; сила 3 у злости — не
 * раздражение, а ярость. Развилка по ИМЕНИ, а не по ключу: на ключ happy/angry
 * теперь сводятся и чужие имена (praise, disgust), и они в ярость/праздник
 * уходить не должны — раньше не уходили.
 */
export function moodToEmotion(mood, intensity) {
  const name = String(mood || '').toLowerCase()
  const key = MOOD_EMOTION.get(name)
  if (!key) return null
  if (name === 'joy' && intensity >= 3) return 'celebrate'
  if (name === 'anger' && intensity >= 3) return 'rage'
  return key
}
