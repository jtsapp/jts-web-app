// Эмоции аватара тьютора. Лицо — готовые рендеры карточек Figma «Speaking
// Buddy», разобранные на слои (см. buddyRig.js), а не рисунок в коде: прежний
// canvas-движок рисовал «похоже на макет», и наклон тела, подложки, свечение и
// значки руками не совпадали. Меняется карточка в Figma — перевыгружай слои.
//
// label — подпись для aria-label, ровно как вариант называется в макете.
//
// speaks — эмоция держится на лице и пока тьютор говорит. Остальные на время
// реплики уступают карточке «Говорит» и проявляются, когда он замолчит. Решение
// по продукту: сильная эмоция — это тон самой реплики (сочувствует, злится,
// радуется, язвит), и подменять её на время речи нейтральным «Говорит» значит
// показывать ученику тон уже после того, как фраза прозвучала.
export const EMOTIONS = {
  idle: { label: 'Дефолт' },
  confused: { label: 'Не понимает' },
  talking: { label: 'Говорит' },
  listening: { label: 'Слушает' },
  thinking: { label: 'Думает' },
  happy: { label: 'Счастлив', speaks: true },
  celebrate: { label: 'Радуется', speaks: true },
  angry: { label: 'Злится', speaks: true },
  sleepy: { label: 'Скука' },
  gloat: { label: 'Соркастичен', speaks: true },
  surprised: { label: 'Удивление' },
  sympathy: { label: 'Сочувствие', speaks: true },
  rage: { label: 'Ярость', speaks: true },
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
