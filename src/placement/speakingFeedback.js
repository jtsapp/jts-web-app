// Отзыв о говорении теста уровня — «отзыв преподавателя», который пишет грейдер (/api/placement/speaking).
//
// Раньше его показывало само окно говорения сразу после записи: отдельный итог посреди теста, раньше результатов
// остальных навыков, и ученик не понимал, конец это или нет (жалоба 16.10.2026). Теперь окно только оценивает, а
// отзыв едет вместе с уровнем в состояние теста (app.speaking.feedback — патч validateSpeaking в
// scripts/build-placement-v16.js) и оттуда в конверт. Показывается он в итоге, рядом со всеми навыками: на экране
// результата v16 (крючок JTSHostSpeakingFeedback, bridge.js) и в отчёте «Главной» (reportModel.js).

const MAX_ITEMS = 3
// Грейдер просит 2–3 предложения; потолок — от раздутого ответа модели, конверт не резиновый (MAX_ENVELOPE_BYTES).
const MAX_LEN = 600

const clean = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_LEN) : '')
const list = (v) => (Array.isArray(v) ? v.map(clean).filter(Boolean).slice(0, MAX_ITEMS) : [])

/**
 * { summary, strengths, improvements } из ответа оценки или из сохранённого конверта; null — отзыва нет. Только
 * отзыв: стенограмму речи в конверт не кладём — отчёту она не нужна, а хранить её незачем.
 */
export function pickFeedback(raw) {
  if (!raw || typeof raw !== 'object') return null
  const f = { summary: clean(raw.summary), strengths: list(raw.strengths), improvements: list(raw.improvements) }
  return f.summary || f.strengths.length || f.improvements.length ? f : null
}

// Экран итога v16 говорит на языке теста (у него свой переключатель), а не приложения — подписи свои, на трёх языках.
const TITLES = {
  ru: { title: 'Отзыв о говорении', strengths: 'Что получилось', improvements: 'Над чем поработать' },
  kk: { title: 'Сөйлеу бойынша пікір', strengths: 'Күшті жақтары', improvements: 'Нені жақсарту керек' },
  en: { title: 'Speaking feedback', strengths: 'What went well', improvements: 'What to work on' },
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c])

// Стили панели — прямо в разметке: у автора нет правил для заголовка внутри pr-panel и для крупного абзаца, а тащить
// ради трёх строк свой <style> в чужую страницу (и патч сборки под него) дороже.
const SUMMARY = 'font-size:16px;line-height:1.7;color:#30283a;margin:0 0 22px'
const H3 = 'font-size:16px;line-height:1.4;font-weight:800;margin:0 0 10px'

/**
 * Панель отзыва для экрана итога v16 — разметкой и классами автора (pr-panel, pr-kicker, pr-evidence), чтобы
 * встала в его вёрстку. Текст отзыва пишет модель, поэтому всё экранируется. Пустая строка — панели нет.
 */
export function feedbackHtml(speaking, lang) {
  if (speaking?.status !== 'completed') return ''
  const f = pickFeedback(speaking.feedback)
  if (!f) return ''
  const tt = TITLES[lang] || TITLES.ru
  const block = (title, items) =>
    items.length ? `<div><h3 style="${H3}">${esc(title)}</h3><ul>${items.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''
  const lists = block(tt.strengths, f.strengths) + block(tt.improvements, f.improvements)
  return (
    `<section class="pr-panel jts-sf"><span class="pr-kicker">SPEAKING${speaking.level ? ` · ${esc(speaking.level)}` : ''}</span>` +
    `<h2>${esc(tt.title)}</h2>${f.summary ? `<p style="${SUMMARY}">${esc(f.summary)}</p>` : ''}` +
    (lists ? `<div class="pr-evidence">${lists}</div>` : '') +
    '</section>'
  )
}
