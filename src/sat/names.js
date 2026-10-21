// Имена доменов и навыков SAT — официальные названия College Board, на английском при любом языке интерфейса
// (ТЗ SAT 17.10, задача 6): студент встречает их в Bluebook, официальных материалах и отчёте о результатах экзамена,
// и не должен заново сопоставлять темы. Переводится интерфейс вокруг (статусы, подписи), а не сами названия.
// Имена — здесь, а не в taxonomy.json: тот перезаписывает выгрузка прототипа (scripts/sat/export-sat.js).
import TAXONOMY from './data/taxonomy.json'

// Официальные названия College Board для наших id. Навыки, которых у College Board нет отдельно (units, radians) или
// которые у нас шире официального (linear, statistics), — ближайшим официальным названием; разбор — SAT-ТЗ-замечания.md.
export const OFFICIAL_NAME = {
  'rw.ii': 'Information and Ideas',
  'rw.cs': 'Craft and Structure',
  'rw.ei': 'Expression of Ideas',
  'rw.sec': 'Standard English Conventions',
  'm.alg': 'Algebra',
  'm.adv': 'Advanced Math',
  'm.psda': 'Problem-Solving and Data Analysis',
  'm.geo': 'Geometry and Trigonometry',
  'rw.ii.central-ideas': 'Central Ideas and Details',
  'rw.ii.inferences': 'Inferences',
  'rw.ii.evidence-textual': 'Command of Evidence: Textual',
  'rw.ii.evidence-quantitative': 'Command of Evidence: Quantitative',
  'rw.cs.words-in-context': 'Words in Context',
  'rw.cs.text-structure-purpose': 'Text Structure and Purpose',
  'rw.cs.cross-text-connections': 'Cross-Text Connections',
  'rw.ei.rhetorical-synthesis': 'Rhetorical Synthesis',
  'rw.ei.transitions': 'Transitions',
  'rw.sec.boundaries': 'Boundaries',
  'rw.sec.form-structure-sense': 'Form, Structure, and Sense',
  'm.alg.linear': 'Linear Equations and Functions',
  'm.alg.systems': 'Systems of Linear Equations',
  'm.alg.inequalities': 'Linear Inequalities',
  'm.adv.expressions': 'Equivalent Expressions',
  'm.adv.functions': 'Nonlinear Functions',
  'm.adv.nonlinear': 'Nonlinear Equations',
  'm.psda.ratios': 'Ratios, Rates, Proportional Relationships, and Units',
  'm.psda.percentages': 'Percentages',
  'm.psda.units': 'Units',
  'm.psda.statistics': 'Distributions and Measures of Center and Spread',
  'm.psda.probability': 'Probability and Conditional Probability',
  'm.geo.triangles': 'Lines, Angles, and Triangles',
  'm.geo.circles': 'Circles',
  'm.geo.area-volume': 'Area and Volume',
  'm.geo.trig-ratios': 'Right Triangles and Trigonometry',
  'm.geo.radians': 'Degrees and Radians',
}

// lang не влияет на имя (оставлен в подписи, чтобы не трогать два десятка вызовов).
const nameOf = (o) => (o ? OFFICIAL_NAME[o.id] || o.name_en : null)

// Вопросы без навыка (наборы юнитов, Challenge, past papers) бэкенд метит секцией: skill_id / domain = 'rw' | 'math'.
// Такой «навык» называем секцией, а не печатаем голый код.
const SECTION_NAME = { rw: 'Reading and Writing', math: 'Math' }

export function domainName(id, lang) {
  if (SECTION_NAME[id]) return SECTION_NAME[id]
  return nameOf(TAXONOMY.domains.find((d) => d.id === id)) || OFFICIAL_NAME[id] || id
}

// Старые навыки Advanced Math (до таксономии 10.2026) остаются в планах и попытках — показываем новым именем
const LEGACY_SKILL = {
  'm.adv.quadratics': 'm.adv.nonlinear',
  'm.adv.polynomials': 'm.adv.expressions',
  'm.adv.exponential': 'm.adv.functions',
  'm.adv.radicals': 'm.adv.nonlinear',
  'm.adv.rational': 'm.adv.expressions',
}

export function skillName(id, lang) {
  if (SECTION_NAME[id]) return SECTION_NAME[id]
  const sid = LEGACY_SKILL[id] || id
  return nameOf(TAXONOMY.skills.find((s) => s.id === sid)) || OFFICIAL_NAME[sid] || id
}

export function skillSection(id) {
  if (id === 'rw' || id === 'math') return id
  return TAXONOMY.skills.find((s) => s.id === id)?.section || (String(id).startsWith('m.') ? 'math' : 'rw')
}

export function domainSection(id) {
  if (id === 'rw' || id === 'math') return id
  return TAXONOMY.domains.find((d) => d.id === id)?.section || (String(id).startsWith('m.') ? 'math' : 'rw')
}

export { TAXONOMY }
