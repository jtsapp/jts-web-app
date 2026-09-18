import { BUDDY_RIG } from './buddyRig.js'

// Плавная смена эмоций (TutorFace с morph, витрина на дашборде): сколько едет
// поза и гаснет уходящее лицо. Столько же уходящий набор держит своё движение
// (is-leaving). В CSS длительность уходит переменной --face-swap — число одно.
export const SWAP_MS = 600

// За сколько уходящее лицо успокаивает собственное движение (см. settleMotion).
// Новое начинает проявляться на 25 % смены (150 мс) — к этому моменту ease-out
// успевает погасить почти всё смещение, и второго контура не видно.
export const SETTLE_MS = 200

// Центр тела каждой карточки — в % общего холста 726 (того же, что у base и box
// в buddyRig.js). В выгрузке из Figma его нет, а плавной смене он нужен: тела
// у эмоций стоят по-разному, и у «Не понимает», «Говорит», «Удивление»,
// «Слушает», «Думает» сдвинуты на 2–3 % под пузырь и значки — без учёта
// сдвига тело на смене прыгало бы вбок.
//
// talking, happy, thinking и gloat — точные числа с узлов Figma (те же точки
// опоры .t-face__body у петель в tutor.css). Остальные замерены по
// base-картинке: центр контура тела плюс 0.06 % на сглаженный край — ровно
// столько замер недобирал у тех четырёх. Перевыгрузил карточки — перемерь.
export const BODY_CENTER = {
  idle: [50.03, 50.05],
  confused: [46.67, 50.45],
  talking: [46.69, 50.46],
  listening: [51.91, 51.53],
  thinking: [46.697, 52.249],
  happy: [50.01, 50.04],
  celebrate: [50.02, 50.04],
  angry: [49.97, 50.04],
  sleepy: [50, 50.03],
  gloat: [49.994, 50.046],
  surprised: [46.66, 50.39],
  sympathy: [49.97, 50.04],
  rage: [49.97, 50.04],
}

// Первый кадр движения тела, если он не покой карточки. На смене новое лицо
// стоит на паузе именно в первом кадре, а уходящее успокаивается в него же
// (settleMotion), — значит и общая поза обязана совмещать тела там, а не в
// покое карточки. Иначе «Счастлив» входил бы с телом на 12° в стороне.
//  - happy: петля макета начинается с первого кадра дизайнера, а карточка —
//    гибрид кадров (наклон второго): тело body повёрнуто на 12° вокруг своего
//    центра, в покое карточки петля не бывает вовсе;
//  - thinking: покачивание rig начинается с −1.5° вокруг низа тела.
// Сверяется с keyframes в tutor.css тестом (tutorFaceCss.test.js).
export const FIRST_FRAME = {
  happy: { part: 'body', turn: 12 },
  thinking: { part: 'rig', turn: -1.5 },
}

// Точка опоры .t-face__rig в холсте (transform-origin в tutor.css): низ тела.
const RIG_PIVOT = [50, 67]

/**
 * Где тело эмоции стоит в первом кадре движения: центр в % холста и наклон.
 * body вращается вокруг центра тела — центр на месте; rig — вокруг низа тела,
 * и центр уезжает по дуге. Холст квадратный, поэтому поворот в процентах
 * тот же, что в пикселях.
 */
export function restPose(key) {
  const center = BODY_CENTER[key]
  const tilt = BUDDY_RIG[key].tilt
  const first = FIRST_FRAME[key]
  if (!first) return { center, tilt }
  const [px, py] = first.part === 'rig' ? RIG_PIVOT : center
  const a = (first.turn * Math.PI) / 180
  const dx = center[0] - px
  const dy = center[1] - py
  return {
    center: [px + dx * Math.cos(a) - dy * Math.sin(a), py + dx * Math.sin(a) + dy * Math.cos(a)],
    tilt: tilt + first.turn,
  }
}

/**
 * Поза набора key, в которой его тело совпадает с телом эмоции anchor: сдвиг на
 * разницу центров и поворот на разницу наклонов вокруг центра СВОЕГО тела (оба
 * — в первом кадре движения, см. restPose). Проценты translate считаются от
 * самого набора — а это и есть холст, в котором заданы центры.
 *
 * Все наборы стоят в позе видимого, поэтому при смене поза у всех едет одним
 * переходом, и тела уходящего и нового совпадают в каждом кадре — на экране
 * одно тело, которое доворачивается к новой эмоции (как Smart Animate).
 */
export function poseStyle(key, anchor) {
  const {
    center: [x, y],
    tilt,
  } = restPose(key)
  const {
    center: [ax, ay],
    tilt: anchorTilt,
  } = restPose(anchor)
  return {
    transformOrigin: `${fix(x)}% ${fix(y)}%`,
    transform: `translate(${fix(ax - x)}%, ${fix(ay - y)}%) rotate(${fix(anchorTilt - tilt)}deg)`,
  }
}

// Разность дробей даёт хвосты вроде −3.3200000000000003: стилю они ни к чему.
const fix = (n) => Math.round(n * 1000) / 1000

/**
 * Успокоить тело уходящего набора: rig и body за SETTLE_MS плавно идут от
 * текущего положения к первому кадру своего движения (restPose). Общая поза
 * совмещает тела там, а у эмоций своё движение — петля «Счастлив» качает тело
 * на 12°, прыжок «Радуется» уводит на 5 % холста, — и без успокоения из-под
 * нового тела выглядывал бы второй контур. Остановить CSS-анимацию нельзя —
 * тело прыгнуло бы, поэтому поверх неё идёт WAAPI-анимация: она старше по
 * порядку композиции и перекрывает CSS, не трогая её. Снимать — cancel() в
 * конце смены, когда уходящее уже погасло.
 *
 * @returns запущенные анимации; без WAAPI (jsdom) — пустой список
 */
export function settleMotion(stack) {
  if (!stack) return []
  return ['.t-face__rig', '.t-face__body'].flatMap((sel) => {
    const el = stack.querySelector(sel)
    if (typeof el?.animate !== 'function') return []
    const from = getComputedStyle(el).transform || 'none'
    const to = firstFrame(el)
    if (from === 'none' && to === 'none') return []
    return [el.animate([{ transform: from }, { transform: to }], { duration: SETTLE_MS, easing: 'ease-out', fill: 'forwards' })]
  })
}

// Первый кадр — у самой CSS-анимации элемента: так цель успокоения не
// разъедется с keyframes, даже если их перерисуют. Нет движения — покой.
function firstFrame(el) {
  const motion = el.getAnimations?.().find((a) => a.animationName)
  return motion?.effect?.getKeyframes?.()[0]?.transform || 'none'
}

/**
 * Поставить CSS-движения набора в начало. Новое лицо стоит на паузе в первом
 * кадре (is-entering), но набор, вернувшийся на экран посреди прошлой смены,
 * приходит со своим движением посреди цикла — без перемотки он замер бы не в
 * первом кадре, и тела разошлись бы. Переходы набора (поза, прозрачность) не
 * трогаем — у них нет animationName.
 */
export function rewindMotion(stack) {
  stack?.getAnimations?.({ subtree: true }).forEach((a) => {
    if (a.animationName) a.currentTime = 0
  })
}
