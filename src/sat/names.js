// Имена доменов и навыков SAT на языке интерфейса — из таксономии (src/sat/data/taxonomy.json). У R&W русские имена
// доменов — английские, как в Figma («Information and Ideas»): так их называет College Board и сам экзамен.
import TAXONOMY from './data/taxonomy.json'
import { pick } from './model/profile.js'

const names = (o) => (o ? { en: o.name_en, ru: o.name_ru, kk: o.name_kk } : null)

// Вопросы без навыка (наборы юнитов, Challenge, past papers) бэкенд метит секцией: skill_id / domain = 'rw' | 'math'.
// Такой «навык» называем секцией, а не печатаем голый код.
const SECTION_NAME = { rw: 'Reading and Writing', math: 'Math' }

export function domainName(id, lang) {
  if (SECTION_NAME[id]) return SECTION_NAME[id]
  return pick(names(TAXONOMY.domains.find((d) => d.id === id)), lang) || id
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
  return pick(names(TAXONOMY.skills.find((s) => s.id === sid)), lang) || id
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
