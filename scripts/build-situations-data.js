// Режет данные разговорной практики из уровневых страниц прототипа
//   public/practice/situations/<level>.html   (массив `const SITUATIONS = [...]`)
// в данные для нативного экрана
//   public/practice/situations/<level>.json
//
// Запуск: node scripts/build-situations-data.js
//
// Почему отдельный скрипт, а не ветка в scripts/extract-situations.js: тот
// ходит в исходный «ситуаций.html» на 62 МБ (base64-видео внутри), которого в
// репозитории нет и на машине обычно тоже. Этот работает по тому, что уже
// лежит в репе, поэтому его можно прогнать в любой момент.
//
// Уровневые html после порта приложением НЕ грузятся, но остаются в репе —
// это единственный сохранившийся источник материала.
//
// ВАЖНО: схемы уровней разные (прототипы писались в разное время). A1 — диалог
// с репликами, A2/B2/C1 — сцена с ролями и «миссией», B1 — сцена плюс вопросы
// и связки. Поэтому здесь не «переложить ключи», а привести пять форм к одной:
// экран не должен знать, какой уровень чем отличался.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DIR = path.join(ROOT, 'public/practice/situations')
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const LANGS = ['en', 'kz', 'ru']

// Поле `higgsfield` (промпт, которым генерировали видео) в результат не
// переносится сознательно: внутренняя кухня, студенту не нужна, а весит она
// в данных больше, чем весь диалог.

const MEDIA_PREFIX = '/practice/situations/media/'

/**
 * Достаёт литерал `const SITUATIONS = [...]` и пути медиа из уровневой страницы.
 *
 * У C1 страница пререндеренная: в данных вместо путей стоит флаг `video: 1`, а
 * настоящие mp4/jpg прописаны атрибутами в разметке. Поэтому вместе с массивом
 * собираем медиа из html (в порядке документа) — ими латаем такие уровни.
 * Фильтр по префиксу нужен, чтобы не поймать `'+s.video+'` из JS-шаблона.
 */
function readSituations(level) {
  const file = path.join(DIR, `${level}.html`)
  const html = fs.readFileSync(file, 'utf8')
  const at = html.indexOf('const SITUATIONS = ')
  if (at < 0) throw new Error(`${level}.html: литерал SITUATIONS не найден`)
  const eol = html.indexOf('\n', at)
  const raw = html.slice(at + 'const SITUATIONS = '.length, eol < 0 ? undefined : eol)
  const pick = (re) => [...html.matchAll(re)].map((m) => m[1]).filter((v) => v.startsWith(MEDIA_PREFIX))
  return {
    items: JSON.parse(raw.trim().replace(/;$/, '')),
    videos: pick(/<source src="([^"]+)"/g),
    posters: pick(/poster="([^"]+)"/g),
  }
}

/** Трёхъязычный узел → {en,kz,ru}; пустой/неполный — ошибка, не тихий пропуск. */
function ml(node, where) {
  if (!node || typeof node !== 'object') throw new Error(`${where}: ожидался {en,kz,ru}, пришло ${JSON.stringify(node)}`)
  const out = {}
  for (const lang of LANGS) {
    const v = node[lang]
    if (typeof v !== 'string' || !v.trim()) throw new Error(`${where}: пустой ${lang}`)
    out[lang] = v.trim()
  }
  return out
}

function mlList(list, where) {
  if (list == null) return null
  if (!Array.isArray(list)) throw new Error(`${where}: ожидался массив`)
  return list.map((item, i) => ml(item, `${where}[${i}]`))
}

/**
 * Реплики сцены к одному виду.
 *
 * A1 хранит диалог как [{sp, en,kz,ru}] и красит реплики по чётности индекса —
 * ролей там ровно две. У остальных уровней сцена богаче: `who` = 'scene'
 * (ремарка), 'you' (очередь студента говорить вслух) или собеседник с `label`.
 * Приводим к общему виду, чтобы экран рисовал одним компонентом.
 */
function scene(item, where) {
  if (Array.isArray(item.dialogue)) {
    const lines = item.dialogue.map((l, i) => ({
      who: 'them',
      // Чередование ролей — из прототипа: имя говорящего есть, а «кто из
      // двоих» считалось по индексу. Сохраняем, иначе потеряется раскраска.
      side: i % 2,
      label: String(l.sp || '').trim(),
      ...ml(l, `${where}.dialogue[${i}]`),
    }))
    return { kind: 'dialogue', lines }
  }
  if (Array.isArray(item.scenario)) {
    const lines = item.scenario.map((b, i) => {
      const who = b.who === 'scene' || b.who === 'you' ? b.who : 'them'
      return {
        who,
        label: who === 'them' ? String(b.label || b.who || '').trim() : '',
        ...ml(b, `${where}.scenario[${i}]`),
      }
    })
    return { kind: 'scenario', lines }
  }
  return null
}

/** Путь медиа: из данных, а если там флаг (C1) — из разметки по порядку. */
function mediaPath(raw, key, fallback, where) {
  const fromData = typeof raw[key] === 'string' && raw[key].startsWith(MEDIA_PREFIX) ? raw[key] : null
  const src = fromData || fallback
  if (!src) throw new Error(`${where}: не найден ${key} ни в данных, ни в разметке`)
  return src
}

function buildItem(raw, index, level, media) {
  const where = `${level}[${index + 1}]`

  const item = {
    id: index + 1,
    video: mediaPath(raw, 'video', media.videos[index], where),
    poster: mediaPath(raw, 'poster', media.posters[index], where),
    // B1 честно помечает клипы без звуковой дорожки — экран показывает об этом
    // плашку, иначе студент решит, что сломался звук у него.
    hasAudio: raw.hasAudio !== false,
    title: ml(raw.title, `${where}.title`),
    // desc (A1, B1) и setup (A2, B2, C1) — один и тот же блок «что происходит».
    intro: raw.desc || raw.setup ? ml(raw.desc || raw.setup, `${where}.intro`) : null,
    scene: scene(raw, where),
    mission: mlList(raw.mission, `${where}.mission`),
    questions: mlList(raw.questions, `${where}.questions`),
    react: mlList(raw.react, `${where}.react`),
    critical: mlList(raw.critical, `${where}.critical`),
    roleplay: mlList(raw.roleplay, `${where}.roleplay`),
    followup: mlList(raw.followup, `${where}.followup`),
    vocab: mlList(raw.vocab, `${where}.vocab`),
    phrases: mlList(raw.phrases, `${where}.phrases`),
    // connectors (B1) и linkers (B2, C1) — одно и то же: слова-связки.
    linkers: mlList(raw.linkers || raw.connectors, `${where}.linkers`),
    task: ml(raw.task, `${where}.task`),
  }

  // Пустые блоки не тащим в JSON: их отсутствие — сигнал экрану не рисовать секцию.
  for (const key of Object.keys(item)) {
    if (item[key] === null || (Array.isArray(item[key]) && item[key].length === 0)) delete item[key]
  }
  return item
}

/** Файл медиа обязан лежать на диске: битая ссылка = чёрный экран у студента. */
function checkMedia(item, level) {
  for (const key of ['video', 'poster']) {
    const rel = item[key].replace(/^\/practice\/situations\//, '')
    const abs = path.join(DIR, rel)
    if (!fs.existsSync(abs)) throw new Error(`${level}[${item.id}]: нет файла ${item[key]}`)
  }
}

let total = 0
for (const level of LEVELS) {
  const media = readSituations(level)
  const raw = media.items
  if (raw.length !== 10) throw new Error(`${level}: ожидалось 10 сценариев, найдено ${raw.length}`)
  const items = raw.map((r, i) => buildItem(r, i, level, media))
  items.forEach((item) => checkMedia(item, level))
  const out = path.join(DIR, `${level}.json`)
  fs.writeFileSync(out, JSON.stringify({ level, items }, null, 2) + '\n')
  total += items.length
  const kb = Math.round(fs.statSync(out).size / 1024)
  console.log(`${level}: ${items.length} сценариев → ${path.relative(ROOT, out)} (${kb} КБ)`)
}
console.log(`готово: ${total} сценариев на ${LEVELS.length} уровнях`)
