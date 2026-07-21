// Форматирование истории голосовых звонков под экраны «Управление тьютором»
// (список, сгруппированный по дате) и «Транскрипт» (пузыри). Локализация — через
// переданные t/lang зоны тьютора; данные приходят из GET /api/profile/calls.

const LOCALE = { ru: 'ru-RU', kz: 'kk-KZ', en: 'en-US' }

export function callTitle(call, t) {
  if (call?.mode === 'scenario' && call.scenarioName)
    return t('hist.scenario', { name: call.scenarioName })
  if (call?.mode === 'placement') return t('hist.placement')
  if (call?.mode === 'debate') return t('hist.debate')
  return t('hist.free')
}

function callSub(call, t) {
  if (call?.status === 'passed') return t('hist.passed')
  if (call?.status === 'failed') return t('hist.failed')
  return call?.recap || t('hist.freeSub')
}

function fmt(date, lang, opts) {
  try {
    return new Intl.DateTimeFormat(LOCALE[lang] || LOCALE.ru, opts).format(date)
  } catch {
    return ''
  }
}

function timeLabel(date, lang) {
  return fmt(date, lang, { hour: '2-digit', minute: '2-digit', hour12: false })
}

function dateLabel(date, lang) {
  const wd = fmt(date, lang, { weekday: 'long' })
  const dm = fmt(date, lang, { day: '2-digit', month: '2-digit' })
  return wd && dm ? `${wd}, ${dm}`.toUpperCase() : ''
}

// [{date, items:[{id, title, sub, time, call}]}] — формат, который рисует
// TutorManagePage (строки кликабельны, call прокидывается в onOpenCall).
export function groupCallsByDate(calls, t, lang) {
  const groups = []
  const byKey = new Map()
  for (const call of Array.isArray(calls) ? calls : []) {
    const d = new Date(call.createdAt)
    if (Number.isNaN(d.getTime())) continue
    const key = d.toISOString().slice(0, 10)
    let group = byKey.get(key)
    if (!group) {
      group = { date: dateLabel(d, lang), items: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    group.items.push({
      id: call.id,
      title: callTitle(call, t),
      sub: callSub(call, t),
      time: timeLabel(d, lang),
      call,
    })
  }
  return groups
}

// transcript {role} → формат экрана транскрипта {who}: ученик = 'me' (справа,
// оранжевый), тьютор = 'tutor' (слева, фиолетовый).
export function callToMessages(call) {
  if (!call || !Array.isArray(call.transcript)) return []
  return call.transcript
    .filter((turn) => turn && typeof turn.text === 'string')
    .map((turn) => ({ who: turn.role === 'tutor' ? 'tutor' : 'me', text: turn.text }))
}

export function callDateTime(call, lang) {
  const d = new Date(call?.createdAt)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  return { date: dateLabel(d, lang), time: timeLabel(d, lang) }
}
