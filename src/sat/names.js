// Имена доменов и навыков SAT на языке интерфейса — из таксономии (src/sat/data/taxonomy.json). У R&W русские имена
// доменов — английские, как в Figma («Information and Ideas»): так их называет College Board и сам экзамен.
import TAXONOMY from './data/taxonomy.json'
import { pick } from './model/profile.js'

const names = (o) => (o ? { en: o.name_en, ru: o.name_ru, kk: o.name_kk } : null)

export function domainName(id, lang) {
  return pick(names(TAXONOMY.domains.find((d) => d.id === id)), lang) || id
}

export function skillName(id, lang) {
  return pick(names(TAXONOMY.skills.find((s) => s.id === id)), lang) || id
}

export function skillSection(id) {
  return TAXONOMY.skills.find((s) => s.id === id)?.section || (String(id).startsWith('m.') ? 'math' : 'rw')
}

export function domainSection(id) {
  return TAXONOMY.domains.find((d) => d.id === id)?.section || (String(id).startsWith('m.') ? 'math' : 'rw')
}

export { TAXONOMY }
