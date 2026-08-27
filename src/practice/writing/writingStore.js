'use client'

// Локальные артефакты «Письма»: черновики, свои слова, журнал ответов, кэш
// перевода, планы/идеи. Перенос хранилищ из data/jtswriting.html (Store.get/set,
// drafts/mywords/review/tcache/plan/guided/ideas), но БЕЗ серверного синка:
// в отличие от прогресса (writingProgress.js) это черновая кухня ученика —
// терять её при переустановке браузера не страшно, а гонять по сети дорого.
// Все чтения/записи в try/catch: приватный режим и квота не должны ронять UI.

const DRAFTS_KEY = 'jts_writing_drafts'
const WORDS_KEY = 'jts_writing_words'
const JOURNAL_KEY = 'jts_writing_journal'
const TCACHE_KEY = 'jts_writing_tcache'
const AUX_KEY = 'jts_writing_aux'

// Полный список ключей артефактов — для clearLocalPractice: на общей машине
// черновики и журнал не должны достаться следующему аккаунту после выхода.
export const WRITING_ARTIFACT_KEYS = [DRAFTS_KEY, WORDS_KEY, JOURNAL_KEY, TCACHE_KEY, AUX_KEY]

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    const val = raw ? JSON.parse(raw) : null
    return val && typeof val === 'object' && !Array.isArray(val) ? val : fallback
  } catch {
    return fallback
  }
}
function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* приватный режим / квота — работаем без персиста */
  }
}

/* ── Черновики ─────────────────────────────────────────────────────────── */

// Кап из прототипа (persistDraft, jtswriting.html:11832): свежие в начале,
// хвост старше 60 записей отваливается.
const MAX_DRAFTS = 60
// Снимков на черновик — как в прототипе snapshot(): «последние десять».
const MAX_VERSIONS = 10
// Два снимка ближе 30 секунд склеиваются в один — иначе автосейв раз в пару
// секунд забил бы всю историю одним и тем же абзацем.
const COALESCE_MS = 30000

function readDrafts() {
  const d = readJson(DRAFTS_KEY, null)
  return Array.isArray(d?.items) ? d.items : []
}

export function draftsAll() {
  return readDrafts()
}

// id из прототипа (jtswriting.html:11340) — переносим побуквенно, чтобы старые
// и новые id жили в одном списке неотличимо.
export function newDraftId() {
  return 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
}

// Upsert по id: черновик уезжает в начало списка (список упорядочен по свежести,
// и currentDraftFor подстраховывается сравнением updatedAt, как в прототипе).
export function saveDraft(draft) {
  if (!draft || typeof draft !== 'object' || !draft.id) return
  const next = { ...draft, updatedAt: Date.now() }
  const items = readDrafts().filter((it) => it && it.id !== draft.id)
  items.unshift(next)
  writeJson(DRAFTS_KEY, { items: items.slice(0, MAX_DRAFTS) })
  return next
}

export function currentDraftFor(genreId) {
  let best = null
  for (const it of readDrafts()) {
    if (it && it.genreId === genreId && (!best || it.updatedAt > best.updatedAt)) best = it
  }
  return best
}

export function lastAssessmentFor(genreId) {
  const d = currentDraftFor(genreId)
  return d && d.assessment ? d.assessment : null
}

// Снимок версии внутри записи черновика. Логика — прототипный snapshot()
// (jtswriting.html:11841): тот же текст — не пишем; свежий (<30 c) — заменяем
// последний снимок, force (явное «Сохранить») всегда добавляет новый.
export function snapshotDraft(draftId, text, force) {
  const items = readDrafts()
  const d = items.find((it) => it && it.id === draftId)
  if (!d) return
  const snaps = Array.isArray(d.versions) ? d.versions : []
  const last = snaps[0]
  if (last && last.text === text) return
  if (!force && last && Date.now() - last.ts < COALESCE_MS) snaps[0] = { ts: Date.now(), text }
  else snaps.unshift({ ts: Date.now(), text })
  d.versions = snaps.slice(0, MAX_VERSIONS)
  writeJson(DRAFTS_KEY, { items })
}

export function versionsFor(draftId) {
  const d = readDrafts().find((it) => it && it.id === draftId)
  return d && Array.isArray(d.versions) ? d.versions : []
}

/* ── План/направляемые ответы/выбранные идеи (шаг Planning) ────────────── */

// В прототипе это три семейства ключей (plan.<id>/guided.<id>/ideas.<id>);
// здесь один ключ с тремя картами — чтобы clearLocalPractice не гонялся за
// ключами с динамическим суффиксом.
function readAux() {
  const a = readJson(AUX_KEY, null)
  return {
    plans: a?.plans && typeof a.plans === 'object' ? a.plans : {},
    guided: a?.guided && typeof a.guided === 'object' ? a.guided : {},
    ideas: a?.ideas && typeof a.ideas === 'object' ? a.ideas : {},
  }
}

export function getPlan(genreId) {
  const list = readAux().plans[genreId]
  return Array.isArray(list) ? list : []
}
export function setPlan(genreId, outline) {
  const aux = readAux()
  aux.plans[genreId] = Array.isArray(outline) ? outline : []
  writeJson(AUX_KEY, aux)
}

export function getGuided(genreId) {
  const items = readAux().guided[genreId]
  return items && typeof items === 'object' ? items : {}
}
export function setGuided(genreId, items) {
  const aux = readAux()
  aux.guided[genreId] = items && typeof items === 'object' ? items : {}
  writeJson(AUX_KEY, aux)
}

export function getIdeas(genreId) {
  const list = readAux().ideas[genreId]
  return Array.isArray(list) ? list : []
}
export function setIdeas(genreId, picked) {
  const aux = readAux()
  aux.ideas[genreId] = Array.isArray(picked) ? picked : []
  writeJson(AUX_KEY, aux)
}

/* ── Мои слова ─────────────────────────────────────────────────────────── */

export function myWords() {
  const w = readJson(WORDS_KEY, null)
  return Array.isArray(w?.items) ? w.items : []
}

// Прототип складывает слова в нижнем регистре с обоих входов (перевод-попап и
// панель Words) — храним так же, дедуп получается сам собой.
export function addMyWord(word) {
  const w = String(word || '').trim().toLowerCase()
  if (!w) return
  const items = myWords()
  if (items.some((x) => String(x).toLowerCase() === w)) return
  items.push(w)
  writeJson(WORDS_KEY, { items })
}

export function removeMyWord(word) {
  const w = String(word || '').trim().toLowerCase()
  const items = myWords().filter((x) => String(x).toLowerCase() !== w)
  writeJson(WORDS_KEY, { items })
}

/* ── Журнал ответов итоговой проверки ──────────────────────────────────── */

// Кап — прототипный noteAnswer (jtswriting.html:12523): у каждого пункта n
// хранится ровно один (последний) ответ, поэтому список ограничен числом
// пунктов задания и бесконечно расти не может.
export function noteAnswer(genreId, taskId, rec) {
  if (!genreId || !taskId || !rec || typeof rec !== 'object') return
  const journal = readJson(JOURNAL_KEY, {})
  const byTask = journal[genreId] && typeof journal[genreId] === 'object' ? journal[genreId] : {}
  const list = (Array.isArray(byTask[taskId]) ? byTask[taskId] : []).filter((x) => x.n !== rec.n)
  list.push(rec)
  list.sort((a, b) => a.n - b.n)
  byTask[taskId] = list
  journal[genreId] = byTask
  writeJson(JOURNAL_KEY, journal)
}

export function answersFor(genreId, taskId) {
  const journal = readJson(JOURNAL_KEY, {})
  const list = journal[genreId]?.[taskId]
  return Array.isArray(list) ? list : []
}

/* ── Кэш переводов ─────────────────────────────────────────────────────── */

// Кап 400 записей, вытесняем самую старую по порядку вставки — как в прототипе
// (jtswriting.html:10202): Object.keys() у обычного объекта отдаёт ключи в
// порядке добавления.
const MAX_TCACHE = 400

export function cachedTranslation(text) {
  const items = readJson(TCACHE_KEY, null)?.items
  const hit = items && typeof items === 'object' ? items[String(text || '').toLowerCase()] : null
  return hit && typeof hit === 'object' ? hit : null
}

export function rememberTranslation(text, ru, kk) {
  const key = String(text || '').toLowerCase()
  if (!key) return
  const cache = readJson(TCACHE_KEY, null)
  const items = cache?.items && typeof cache.items === 'object' ? cache.items : {}
  items[key] = { ru, kk }
  const keys = Object.keys(items)
  if (keys.length > MAX_TCACHE) delete items[keys[0]]
  writeJson(TCACHE_KEY, { items })
}
