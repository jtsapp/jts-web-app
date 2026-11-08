// Теги уроков гида Desmos (решение 08.11.2026): 23 урока остаются плоским списком, над ним — фильтр по одному тегу на
// урок. desmosGuide.json выгружается из прототипа (scripts/sat/build-reference.js), правка руками пропала бы при
// следующей выгрузке, поэтому тег — здесь, по id урока. Раскладку стоит сверить с методистом.

export const DESMOS_TAGS = ['basics', 'equations', 'functions', 'data', 'tricks']

export const LESSON_TAG = {
  intercepts: 'basics',
  minmax: 'basics',
  l8: 'basics',
  l20: 'basics',
  solve: 'equations',
  system: 'equations',
  l5: 'equations',
  l6: 'equations',
  l7: 'equations',
  l10: 'equations',
  l11: 'equations',
  l15: 'equations',
  l12: 'functions',
  l17: 'functions',
  l19: 'functions',
  l9: 'data',
  l13: 'data',
  l16: 'data',
  l21: 'data',
  l14: 'tricks',
  l18: 'tricks',
  l22: 'tricks',
  l23: 'tricks',
}

export function tagOf(lesson) {
  return lesson?.tag || LESSON_TAG[lesson?.id] || null
}

/** Теги, у которых есть уроки, — в порядке DESMOS_TAGS: пустой кнопки фильтра не будет. */
export function tagsIn(sections = []) {
  const have = new Set(sections.map(tagOf).filter(Boolean))
  return DESMOS_TAGS.filter((x) => have.has(x))
}

/**
 * Уроки под фильтром с их настоящим номером: фильтр только скрывает, порядок и нумерация остаются целыми.
 * tag 'all' — все.
 */
export function filterLessons(sections = [], tag = 'all') {
  return sections.map((s, i) => ({ s, i })).filter(({ s }) => tag === 'all' || tagOf(s) === tag)
}
