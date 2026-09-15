// Слои лица тьютора по эмоциям. СГЕНЕРИРОВАНО из Figma — руками не править,
// перевыгружай.
//
// Источник — component set «Speaking Buddy» (файл HbXfjz582soaO4UzzbwBBa, node
// 5080:1807). Каждая карточка разобрана на слои через временный инстанс: в нём
// скрывается всё, кроме слоя, инстанс экспортируется (PNG ×2) и удаляется, —
// сами компоненты в макете не меняются. base — подложки + тело со свечением
// карточки (drop shadow 140), остальные слои — без свечения: глаза и значки.
// Раздельно, чтобы их можно было анимировать независимо (моргание, всплывающие
// «Zzz», печатающие точки), а вместе они дают ровно рендер карточки.
//
// box — [x, y, w, h] в % общего холста 726×726 единиц вокруг центра рамки
// 428×428 (тот же холст, что у base). tilt — наклон тела в карточке, градусы
// CSS: моргание сплющивает глаза вдоль их собственной оси, а не экрана.
export const BUDDY_RIG = {
  idle: {
    tilt: -15,
    layers: [
      { part: 'base', src: '/tutor/buddy/idle.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/idle-eyes.webp', box: [43.7328, 45.0413, 16.0468, 7.3691] },
    ],
  },
  confused: {
    tilt: 0,
    layers: [
      { part: 'base', src: '/tutor/buddy/confused.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/confused-eyes.webp', box: [41.5978, 46.4187, 13.9118, 5.5785] },
      { part: 'bubble', src: '/tutor/buddy/confused-bubble.webp', box: [65.2204, 33.0579, 12.4656, 11.6391] },
    ],
  },
  talking: {
    tilt: 9.2,
    layers: [
      { part: 'base', src: '/tutor/buddy/talking.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/talking-eyes.webp', box: [41.6667, 45.9366, 13.0165, 7.0248] },
      { part: 'bubble', src: '/tutor/buddy/talking-bubble.webp', box: [61.2259, 45.1102, 12.741, 11.5014] },
      { part: 'dot1', src: '/tutor/buddy/talking-dot1.webp', box: [63.5675, 49.6556, 2.3416, 2.2727] },
      { part: 'dot2', src: '/tutor/buddy/talking-dot2.webp', box: [65.7713, 50.6887, 2.2727, 2.3416] },
      { part: 'dot3', src: '/tutor/buddy/talking-dot3.webp', box: [67.9063, 51.7906, 2.2727, 2.2727] },
    ],
  },
  listening: {
    tilt: -7.7,
    layers: [
      { part: 'base', src: '/tutor/buddy/listening.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/listening-eyes.webp', box: [49.3802, 46.4187, 12.9477, 6.7493] },
      { part: 'arc1', src: '/tutor/buddy/listening-arc1.webp', box: [71.281, 42.2865, 3.168, 6.2672] },
      { part: 'arc2', src: '/tutor/buddy/listening-arc2.webp', box: [72.7273, 39.5317, 4.27, 11.0882] },
    ],
  },
  thinking: {
    tilt: -6,
    layers: [
      { part: 'base', src: '/tutor/buddy/thinking.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/thinking-eyes.webp', box: [36.7769, 49.9311, 11.4325, 5.9229] },
      { part: 'dot1', src: '/tutor/buddy/thinking-dot1.webp', box: [65.3581, 38.2231, 2.9614, 2.9614] },
      { part: 'dot2', src: '/tutor/buddy/thinking-dot2.webp', box: [68.8017, 38.5675, 2.9614, 2.9614] },
      { part: 'dot3', src: '/tutor/buddy/thinking-dot3.webp', box: [72.2452, 38.9118, 2.9614, 2.8926] },
    ],
  },
  happy: {
    tilt: -18,
    layers: [
      { part: 'base', src: '/tutor/buddy/happy.webp', box: [0, 0, 100, 100] },
      { part: 'spark1', src: '/tutor/buddy/happy-spark1.webp', box: [67.562, 31.5427, 3.8567, 5.4408] },
      { part: 'spark2', src: '/tutor/buddy/happy-spark2.webp', box: [70.1102, 36.0193, 5.3719, 3.8567] },
      { part: 'eyes', src: '/tutor/buddy/happy-eyes.webp', box: [43.595, 43.6639, 15.7025, 9.573] },
    ],
  },
  celebrate: {
    tilt: 6,
    layers: [
      { part: 'base', src: '/tutor/buddy/celebrate.webp', box: [0, 0, 100, 100] },
      { part: 'spark1', src: '/tutor/buddy/celebrate-spark1.webp', box: [71.6942, 41.3223, 5.0275, 4.4766] },
      { part: 'spark2', src: '/tutor/buddy/celebrate-spark2.webp', box: [72.7961, 47.0386, 5.854, 2.4105] },
      { part: 'star1', src: '/tutor/buddy/celebrate-star1.webp', box: [54.27, 44.3526, 8.1267, 8.0579] },
      { part: 'star2', src: '/tutor/buddy/celebrate-star2.webp', box: [43.0441, 43.1818, 8.1267, 7.989] },
    ],
  },
  angry: {
    tilt: 0,
    layers: [
      { part: 'base', src: '/tutor/buddy/angry.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/angry-eyes.webp', box: [43.5262, 46.0744, 17.2176, 4.6143] },
      { part: 'vein', src: '/tutor/buddy/angry-vein.webp', box: [60.2617, 35.6061, 8.8843, 8.8843] },
    ],
  },
  sleepy: {
    tilt: 0,
    layers: [
      { part: 'base', src: '/tutor/buddy/sleepy.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/sleepy-eyes.webp', box: [45.3168, 51.4463, 16.8733, 1.9972] },
      { part: 'z1', src: '/tutor/buddy/sleepy-z1.webp', box: [62.6722, 28.0992, 4.6143, 5.2342] },
      { part: 'z2', src: '/tutor/buddy/sleepy-z2.webp', box: [66.3223, 29.9587, 3.8567, 4.4077] },
      { part: 'z3', src: '/tutor/buddy/sleepy-z3.webp', box: [69.4904, 31.6116, 3.0992, 3.6501] },
    ],
  },
  gloat: {
    tilt: 5,
    layers: [
      { part: 'base', src: '/tutor/buddy/gloat.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/gloat-eyes.webp', box: [45.5234, 44.5592, 16.3223, 6.8182] },
    ],
  },
  surprised: {
    tilt: 3,
    layers: [
      { part: 'base', src: '/tutor/buddy/surprised.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/surprised-eyes.webp', box: [41.6667, 46.2121, 14.4628, 5.854] },
      { part: 'squiggle', src: '/tutor/buddy/surprised-squiggle.webp', box: [62.3967, 31.6804, 6.3361, 6.2672] },
    ],
  },
  sympathy: {
    tilt: 0,
    layers: [
      { part: 'base', src: '/tutor/buddy/sympathy.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/sympathy-eyes.webp', box: [43.4573, 46.0744, 16.7355, 4.6143] },
    ],
  },
  rage: {
    tilt: 0,
    layers: [
      { part: 'base', src: '/tutor/buddy/rage.webp', box: [0, 0, 100, 100] },
      { part: 'eyes', src: '/tutor/buddy/rage-eyes.webp', box: [43.595, 45.5234, 17.0799, 5.1653] },
      { part: 'bang1', src: '/tutor/buddy/rage-bang1.webp', box: [69.5592, 31.6804, 2.686, 7.989] },
      { part: 'bang2', src: '/tutor/buddy/rage-bang2.webp', box: [72.4518, 31.1295, 4.6143, 10.4683] },
    ],
  },
}
