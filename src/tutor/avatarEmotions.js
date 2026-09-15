// Словарь эмоций аватара тьютора: тег → набор чисел. Рендер (avatarEngine.js)
// про эмоции ничего не знает, он умеет только интерполировать эти числа, поэтому
// новая эмоция = строка здесь, без правок движка и без ассетов — КРОМЕ случаев,
// когда пресету нужен примитив, которого движок ещё не умеет (новый режим
// глаз/новый бейдж) — тогда правки в avatarEngine.js неизбежны, как в этом
// редизайне (star-глаза, question/chatDots/soundwave/exclaim бейджи).
//
// Числа заданы для эталонного радиуса R = 150. Движок масштабирует их сам
// (коэффициент k = R/150), поэтому трогать их при смене размера орба не нужно.

// Единый цвет тела — редизайн под Figma component set «Speaking Buddy»
// (node 5080:1807, слой Body, radial gradient). Раньше каждая эмоция красила
// тело по-своему (злость=красный, слушает=голубой...); проверено на всех 13
// карточках нового набора — тело одинаковое ВЕЗДЕ, эмоцию несут белые черты
// лица + цветной бейдж. c1 — светлый стоп градиента (30%), c2 — тёмный (100%).
const BODY_C1 = [115, 61, 222] // #733dde
const BODY_C2 = [85, 29, 144] // #551d90

// Ключи, которые движок гонит через линейную интерполяцию. Пропущенный ключ
// берёт нейтральное значение из KEY_DEFAULTS в avatarEngine.js: для множителей
// (eyeH, eyeW, speed) это единица, для остального — ноль. Поэтому в строках
// ниже пишем только то, что отличается от нейтрального.
export const LERP_KEYS = [
  'eyeH',
  'eyeW',
  'spread',
  'arc',
  'round',
  'lookX',
  'lookY',
  'curve',
  'skew',
  'open',
  'bounce',
  'speed',
  'tilt',
  'asym',
  'brow',
  'shake',
  'star',
]

// Флаги эффектов. Тоже интерполируются: эффект не появляется рывком.
// ring убран — единственный, кто его носил (listening), теперь носит
// soundwave; новые: question/chatDots/soundwave/exclaim (см. avatarEngine.js).
export const FX_KEYS = ['dots', 'spark', 'confetti', 'zzz', 'steam', 'question', 'chatDots', 'soundwave', 'exclaim']

// ВАЖНО: arc держать только в 0 / 1 / -1. Промежуточное значение заставляет
// рендер рисовать И дугу, И полупрозрачную капсулу под ней — выходят двойные
// призрачные глаза. Промежуточные значения допустимы только внутри перехода.
// То же для star: 0/1, промежуточные — только в переходе (см. arc).
//
// Ширина глаза при R=150 — 19..27px. Шире — лицо превращается в маску и
// читается как жуткое. То же для рта: «o» не крупнее ~15px радиуса.
export const EMOTIONS = {
  // ── Служебные: их ставит фронт по состоянию агента, а не модель ──────────
  idle: {
    label: 'Дефолт',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 1.05, eyeW: 1.0, arc: 1, curve: 0.35, bounce: 0.45, speed: 1.0, mouth: 'line',
  },
  listening: {
    label: 'Слушает',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 1.12, lookY: -0.1, curve: 0.2, bounce: 0.5, speed: 0.85, mouth: 'line',
    soundwave: 1,
  },
  thinking: {
    label: 'Думает',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 0.5, eyeW: 1.05, lookX: 0.9, lookY: -0.5, curve: -0.15, bounce: 0.25,
    speed: 0.8, mouth: 'line', dots: 1,
  },
  // Пресета «говорит» тут нет и быть не должно: речь — не эмоция, а слой
  // поверх любой из них (TutorAvatar.setSpeaking). Пока он был эмоцией, лицо на
  // время реплики подменялось нейтральным фиолетовым, и то, что пометил агент,
  // ученик видел только после озвучки — когда тьютор уже замолчал.
  //
  // ИСКЛЮЧЕНИЕ ниже (talking) — осознанный частичный возврат к этому паттерну
  // по прямому решению продукта (Figma-карточка «Говорит»): TutorFace сам
  // подменяет emotion на 'talking', пока speaking=true, поверх ЛЮБОЙ эмоции
  // агента, и возвращает её обратно, как только тьютор замолкает — риск тот
  // же (мимика агента не видна во время речи), принят сознательно.
  talking: {
    label: 'Говорит',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 1.0, eyeW: 1.0, curve: 0.2, bounce: 0.5, speed: 1.0, mouth: 'line',
    chatDots: 1,
  },
  sleepy: {
    label: 'Скука',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 0.28, lookY: 0.25, curve: -0.1, bounce: 0.22, speed: 0.45,
    mouth: 'line', zzz: 1,
  },

  // ── Реакции: приходят тегом от модели ───────────────────────────────────
  happy: {
    label: 'Счастлив',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 1.25, eyeW: 0.85, arc: 1, curve: 1.0, open: 0.5, bounce: 1.2, speed: 1.7,
    mouth: 'open', spark: 1,
  },
  praise: {
    label: 'Хвалит',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 1.0, arc: 1, curve: 0.85, open: 0.4, bounce: 1.0, speed: 1.45,
    mouth: 'open', spark: 1,
  },
  // Звёзды в глазах — самая яркая радость, звено выше happy. Новый режим
  // глаз (см. _drawStarEye в avatarEngine.js), включается star:1.
  celebrate: {
    label: 'Радуется',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 1.0, eyeW: 1.0, star: 1, curve: 1.0, open: 0.9, bounce: 1.8, speed: 2.2,
    mouth: 'open', spark: 1, confetti: 1,
  },
  encourage: {
    label: 'Подбадривает',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 0.95, curve: 0.8, bounce: 0.85, speed: 1.25, mouth: 'line',
  },
  surprised: {
    label: 'Удивление',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 1.0, eyeW: 1.25, round: 1, lookY: -0.05, open: 0.3, bounce: 0.4,
    speed: 1.05, mouth: 'o', pop: 1,
  },
  curious: {
    label: 'Любопытство',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 1.15, eyeW: 1.1, round: 0.3, lookX: 0.35, lookY: -0.35, curve: 0.3,
    bounce: 0.5, speed: 1.0, tilt: 0.6, asym: 0.35, brow: 0.45,
    mouth: 'line',
  },
  confused: {
    label: 'Не понимает',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 1.0, lookX: 0.3, curve: -0.3, bounce: 0.35, speed: 0.9, tilt: 1,
    asym: 1, brow: 0.6, mouth: 'wave', question: 1,
  },
  // Дуга того же знака, что у idle (arc:1) — Сочувствие в новой Figma-сетке
  // рисуется той же «семьёй» дуг-глаз, что дефолт, просто площе (eyeH ниже).
  // Проверено по vectorPaths обеих карточек, не на глаз: у старого кода тут
  // было arc:-1 (другая, противоположная кривизна) — это меняется осознанно.
  sympathy: {
    label: 'Сочувствие',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 0.8, arc: 1, lookY: 0.2, curve: -0.45, bounce: 0.3, speed: 0.7,
    tilt: 0.3, mouth: 'line',
  },
  correcting: {
    label: 'Поправляет',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 0.4, eyeW: 1.15, bounce: 0.3, speed: 0.9, mouth: 'line',
  },
  // Мультяшная ярость, как у злого эмодзи: тяжёлые сдвинутые брови,
  // распахнутые глаза, оскал стиснутых зубов и пар из «ушей».
  angry: {
    label: 'Злится',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 0.95, eyeW: 1.2, round: 1, lookY: 0.05, bounce: 0.55, speed: 1.6,
    brow: -1, shake: 1, mouth: 'grit', steam: 1,
  },
  // Ярость — верхняя ступень злости. Глаза сходятся к переносице (spread),
  // сужаются в щёлки, рот раскрыт на пол-лица, плюс бейдж «‼» (новый).
  rage: {
    label: 'Ярость',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 0.56, eyeW: 1.0, spread: 0.78, bounce: 0.7, speed: 1.9,
    brow: -1, shake: 1, mouth: 'roar', exclaim: 1,
  },
  disgust: {
    label: 'Отвращение',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 0.6, eyeW: 1.05, lookX: -0.25, curve: -0.35, skew: -0.8, bounce: 0.3,
    speed: 0.8, tilt: 0.45, brow: -0.5, mouth: 'line',
  },
  // «Смотрю искоса и ухмыляюсь»: один глаз в щёлочку (asym), взгляд вбок
  // (lookX), голова набок (tilt), улыбка перекошена вверх (skew). В новой
  // Figma-карточке («Соркастичен») у глаз РАЗНАЯ форма по бокам (один —
  // дуга, другой — почти плоская линия) — движок так не умеет (только высоту
  // по asym), заводить per-глаз форму сознательно не стали, см. спеку.
  gloat: {
    label: 'Соркастичен',
    c1: BODY_C1,
    c2: BODY_C2,
    eyeH: 0.78, eyeW: 1.05, lookX: 0.32, curve: 0.85, skew: 1, bounce: 0.5,
    speed: 1.2, tilt: 0.5, asym: 1, mouth: 'line',
  },
}

// Служебные состояния фронт ставит сам; остальное имеет право прислать модель.
export const SERVICE_EMOTIONS = ['idle', 'listening', 'thinking', 'sleepy', 'talking']

// Имя от агента (топик "mood") → ключ пресета. Именно Map, а не литерал:
// у литерала есть цепочка прототипов, и MOOD_EMOTION['constructor'] вернул бы
// функцию Object — то есть «незнакомое» имя прошло бы проверку.
//
// Пять первых имён — исторический словарь агента. Их нельзя выбрасывать даже
// после расширения: задеплоенный воркер обновляется отдельно от Vercel
// (`lk agent deploy` вручную), поэтому какое-то время прод шлёт старый набор.
const MOOD_EMOTION = new Map([
  ['anger', 'angry'],
  ['rage', 'rage'],
  ['disgust', 'disgust'],
  ['joy', 'happy'],
  ['sadness', 'sympathy'],
  ['gloat', 'gloat'],
  ['praise', 'praise'],
  ['encourage', 'encourage'],
  ['correcting', 'correcting'],
  ['surprised', 'surprised'],
  ['curious', 'curious'],
  ['confused', 'confused'],
  ['celebrate', 'celebrate'],
])

/**
 * Тег эмоции от агента → ключ пресета. Незнакомое имя → null (экран не ломаем).
 *
 * Сила 3 у радости — это уже не улыбка, а праздник; сила 3 у злости — не
 * раздражение, а ярость. Отдельных имён у агента для них нет, поэтому обе
 * развилки живут здесь. Имя 'rage' в словаре выше — на случай, если воркер
 * научится присылать его напрямую: он деплоится отдельно от приложения.
 */
export function moodToEmotion(mood, intensity) {
  const key = MOOD_EMOTION.get(String(mood || '').toLowerCase())
  if (!key) return null
  if (key === 'happy' && intensity >= 3) return 'celebrate'
  if (key === 'angry' && intensity >= 3) return 'rage'
  return key
}
