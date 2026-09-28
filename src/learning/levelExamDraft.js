import { userIdFromToken } from '../lib/jwt.js'

// Черновик ответов финального экзамена: 50 вопросов — это час работы, и
// перезагрузка страницы или выход на тропу не должны его стирать. Хранится на
// устройстве, как позиция урока (lib/lessonResume.js), и по той же причине —
// под userId: компьютер бывает общий, и чужие ответы следующему ученику
// достаться не должны.
//
// version — отпечаток вопросов (scripts/extract-level-exams.js): поменял
// методист экзамен — старые ответы к новым вопросам не относятся, черновик
// молча отбрасываем.

const KEY = 'jts_level_exam'
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

const owner = (token) => String(userIdFromToken(token) || 'anon')
const levelKey = (level) => String(level || '').toLowerCase()

function readAll() {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    return all && typeof all === 'object' && !Array.isArray(all) ? all : {}
  } catch {
    return {}
  }
}

function writeAll(all) {
  try {
    if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all))
    else localStorage.removeItem(KEY)
  } catch {
    /* приватный режим — черновик просто не переживёт перезагрузку */
  }
}

// Ответ — исходный индекс варианта. Всё прочее в хранилище считаем мусором
// (ручная правка, старый формат): лучше потерять ответ, чем подсунуть экрану
// значение, которого нет среди вариантов.
function cleanAnswers(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [id, v] of Object.entries(raw)) if (Number.isInteger(v) && v >= 0) out[id] = v
  return out
}

/** Ответы из черновика или null: нет, чужой, устарел, экзамен поменялся. */
export function readExamDraft(token, level, version, now = Date.now()) {
  const saved = readAll()[owner(token)]?.[levelKey(level)]
  if (!saved || saved.v !== version) return null
  if (!(now - saved.at < MAX_AGE_MS)) return null
  const answers = cleanAnswers(saved.answers)
  return Object.keys(answers).length ? answers : null
}

export function saveExamDraft(token, level, version, answers, now = Date.now()) {
  const all = readAll()
  const own = owner(token)
  const mine = all[own] && typeof all[own] === 'object' ? all[own] : {}
  mine[levelKey(level)] = { v: version, answers: cleanAnswers(answers), at: now }
  all[own] = mine
  writeAll(all)
}

export function clearExamDraft(token, level) {
  const all = readAll()
  const own = owner(token)
  if (!all[own]?.[levelKey(level)]) return
  delete all[own][levelKey(level)]
  if (!Object.keys(all[own]).length) delete all[own]
  writeAll(all)
}
