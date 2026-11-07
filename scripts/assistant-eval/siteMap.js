// Карта сайта ученика из кода — для автообновления базы знаний Луны (ТЗ v2.0, 9.2а).
//
// Сама модель о новом разделе не узнает: она знает сайт только по статьям src/lib/assistant/knowledge.js. Поэтому
// карту собирает код — экраны App.jsx (renderScreen), меню (navSections.js), вкладки и карточки Практики
// (practiceTabs.js), разделы, которые Луна умеет открывать (destinations.js), — и сверяет её со статьями:
//  - knowledge.test.js краснеет, если экран или карточку не описывает ни одна статья (поля screens / cards у статьи);
//  - scripts/assistant-eval/site-map.js печатает «новое / изменилось / удалено» против снимка site-map.snapshot.json
//    (его можно повесить в CI: --check выходит с ошибкой, если карта ушла от снимка).
//
// Модуль чистый: тексты App.jsx и i18n.jsx ему передают (тест и скрипт читают их сами), JSX он не исполняет.

import { menuItems } from '../../src/lib/navSections.js'
import { SKILLS } from '../../src/screens/practice/practiceTabs.js'
import { cardOf } from '../../src/screens/practice/practiceCatalog.js'
import { DESTINATIONS } from '../../src/lib/assistant/destinations.js'
import { KNOWLEDGE, knowledgeText } from '../../src/lib/assistant/knowledge.js'

// Экраны, которых ученик не видит или которые не раздел, — с причиной. Всё остальное обязано быть в статье.
export const SCREEN_EXEMPT = {
  booth: 'аккаунт класса (вход в урок с общего компьютера), не ученический кабинет',
  'course-catalog': 'вход только у преподавателя (кнопка в «Уроках» — LessonsPage), ученик сюда не попадает',
}

// Пункт меню → экран (handleNav в App.jsx); остальные ключи открывают экран с тем же именем.
const MENU_SCREEN = { learning: 'kingdom', tutor: 'tutor-dashboard' }

/** Экраны renderScreen из текста App.jsx — каждый `case '…':` внутри функции. */
export function appScreens(appSource) {
  const start = appSource.indexOf('function renderScreen(')
  if (start < 0) throw new Error('в App.jsx нет renderScreen — карта сайта не собирается')
  const body = appSource.slice(start)
  return [...new Set([...body.matchAll(/^\s+case '([a-z0-9-]+)':/gm)].map((m) => m[1]))].sort()
}

/** Русские строки словаря из текста src/i18n.jsx: ключ → строка (первое вхождение — ru-блок). */
export function i18nStrings(i18nSource) {
  const out = {}
  for (const m of i18nSource.matchAll(/'([\w.-]+)':\s*(['"])((?:\\.|(?!\2).)*)\2/g)) {
    if (!(m[1] in out)) out[m[1]] = m[3].replace(/\\(['"])/g, '$1')
  }
  return out
}

/** Карта: экраны, меню, вкладки Практики с карточками, разделы Луны. */
export function buildSiteMap({ appSource, i18nSource }) {
  const t = i18nStrings(i18nSource)
  // Полное меню: всё, что ученик может увидеть на каком-нибудь стенде и тарифе (на проде часть скрыта — config.js).
  const menu = menuItems({ rewards: true, myTeacher: true, exams: { ielts: true, sat: true }, sections: { known: false, allowed: [] } })
    .map((i) => ({ key: i.key, label: t[i.label] || i.label, screen: MENU_SCREEN[i.key] || i.key }))
  const practice = SKILLS.map((s) => ({
    tab: s.key,
    label: t[`practice.skill.${s.key}`] || s.key,
    cards: s.groups.flatMap((g) => g.cards).map((id) => ({ id, title: t[cardOf(id)?.title] || id })),
  }))
  const destinations = DESTINATIONS.map((d) => ({
    id: d.id,
    screen: d.screen,
    ...(d.payload?.filter ? { card: d.payload.filter } : {}),
    ...(d.payload?.skill ? { tab: d.payload.skill } : {}),
  }))
  return { screens: appScreens(appSource), menu, practice, destinations }
}

/**
 * Кто описывает экран / карточку: id статей (поля screens и cards). В screens можно писать «ielts-*»: экраны
 * прохождения IELTS, SAT и звонка тьютора множатся, а описывает их одна статья раздела.
 * @param {string[]} [screenIds] экраны App — чтобы раскрыть шаблоны
 */
export function coverage(articles = KNOWLEDGE, screenIds = []) {
  const screens = {}
  const cards = {}
  const patterns = {}
  for (const a of articles) {
    for (const s of a.screens || []) {
      if (s.endsWith('*')) (patterns[s] ||= []).push(a.id)
      else (screens[s] ||= []).push(a.id)
    }
    for (const c of a.cards || []) (cards[c] ||= []).push(a.id)
  }
  for (const id of screenIds) {
    for (const [p, ids] of Object.entries(patterns)) {
      if (id.startsWith(p.slice(0, -1))) screens[id] = [...new Set([...(screens[id] || []), ...ids])]
    }
  }
  return { screens, cards, patterns }
}

/** Снимок для сравнения между релизами: карта + какие статьи что описывают + короткий хэш текста статьи. */
export function snapshotOf(map, articles = KNOWLEDGE) {
  const cov = coverage(articles, map.screens)
  return {
    screens: Object.fromEntries(map.screens.map((s) => [s, cov.screens[s] || (SCREEN_EXEMPT[s] ? [`исключение: ${SCREEN_EXEMPT[s]}`] : [])])),
    menu: map.menu,
    practice: map.practice,
    destinations: map.destinations,
    articles: Object.fromEntries(articles.map((a) => [a.id, { title: a.title, ...(a.when ? { when: a.when } : {}), hash: hashOf(a.body.join('\n')) }])),
  }
}

// djb2: не крипта, а метка «текст статьи поменялся» в отчёте.
function hashOf(text) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** Отчёт «новое / изменилось / удалено» между двумя снимками — строки для человека. */
export function diffSnapshots(before, after) {
  const added = []
  const changed = []
  const removed = []
  const keyed = (list, key) => Object.fromEntries((list || []).map((x) => [x[key], x]))
  const cmp = (kind, a, b, describe) => {
    for (const k of Object.keys(b)) {
      if (!(k in a)) added.push(`${kind} ${describe(k, b[k])}`)
      else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changed.push(`${kind} ${describe(k, b[k])}: было ${JSON.stringify(a[k])}`)
    }
    for (const k of Object.keys(a)) if (!(k in b)) removed.push(`${kind} ${describe(k, a[k])}`)
  }
  cmp('экран', before.screens || {}, after.screens, (k, v) => `«${k}» → ${v.join(', ') || 'нет статьи'}`)
  cmp('пункт меню', keyed(before.menu, 'key'), keyed(after.menu, 'key'), (k, v) => `«${v.label}» (${k})`)
  cmp('вкладка Практики', keyed(before.practice, 'tab'), keyed(after.practice, 'tab'), (k, v) => `«${v.label}»: ${v.cards.map((c) => c.title).join(', ')}`)
  cmp('раздел Луны', keyed(before.destinations, 'id'), keyed(after.destinations, 'id'), (k, v) => `${k} → ${v.screen}`)
  cmp('статья базы знаний', before.articles || {}, after.articles, (k, v) => `«${v.title}» (${k})`)
  return { added, changed, removed }
}

/**
 * Дыры базы знаний: экраны и карточки без статьи, пункты меню, которых нет в тексте базы, статьи со ссылкой на
 * пропавший экран, неверно названная вкладка или карточка. Каждая строка — что сделать.
 */
export function knowledgeGaps(map, articles = KNOWLEDGE) {
  const gaps = []
  const cov = coverage(articles, map.screens)
  const KB = 'src/lib/assistant/knowledge.js'
  for (const s of map.screens) {
    if (!cov.screens[s] && !SCREEN_EXEMPT[s]) {
      gaps.push(`Экран «${s}» есть в App.jsx, но ни одна статья его не описывает: допиши статью в ${KB} (поле screens) — или, если ученик его не видит, исключение с причиной в scripts/assistant-eval/siteMap.js (SCREEN_EXEMPT).`)
    }
  }
  const screenSet = new Set(map.screens)
  for (const [s, ids] of Object.entries(cov.screens)) {
    if (!screenSet.has(s)) gaps.push(`Статья ${ids.join(', ')} описывает экран «${s}», которого в App.jsx больше нет: поправь статью в ${KB}.`)
  }
  for (const [p, ids] of Object.entries(cov.patterns)) {
    if (!map.screens.some((id) => id.startsWith(p.slice(0, -1)))) gaps.push(`Статья ${ids.join(', ')} описывает экраны «${p}», а таких в App.jsx нет: поправь статью в ${KB}.`)
  }
  const cardTab = {}
  for (const tab of map.practice) for (const c of tab.cards) (cardTab[c.id] ||= []).push(tab.label)
  const tabLabels = new Set(map.practice.map((t) => t.label))
  const byId = Object.fromEntries(articles.map((a) => [a.id, a]))
  for (const tab of map.practice) {
    for (const c of tab.cards) {
      const ids = cov.cards[c.id]
      if (!ids) {
        gaps.push(`Карточка Практики «${c.title}» (${c.id}, вкладка «${tab.label}») без статьи: допиши статью в ${KB} (поле cards).`)
        continue
      }
      const text = ids.map((id) => `${byId[id].title}\n${byId[id].body.join('\n')}`).join('\n')
      if (!text.toLowerCase().includes(c.title.toLowerCase())) {
        gaps.push(`Статья ${ids.join(', ')} не называет карточку так, как её видит ученик: «${c.title}». Допиши название дословно в ${KB}.`)
      }
    }
  }
  // «вкладка «X»» в статье о карточке — X обязана быть вкладкой, где эта карточка лежит: после редизайна Практики
  // статьи называли старые вкладки (Скорочтение «во вкладке Аудирование» — она в «Грамматике»).
  for (const a of articles) {
    if (!a.cards?.length) continue
    const allowed = new Set(a.cards.flatMap((id) => cardTab[id] || []))
    for (const m of a.body.join('\n').matchAll(/вкладк\S*\s+«([^»]+)»/gi)) {
      if (tabLabels.has(m[1]) && !allowed.has(m[1])) {
        gaps.push(`Статья ${a.id} пишет «вкладка «${m[1]}»», а её карточки (${a.cards.join(', ')}) лежат во вкладке «${[...allowed].join('», «')}»: поправь в ${KB}.`)
      }
    }
  }
  for (const d of map.destinations) {
    if (d.card && !cardTab[d.card]) gaps.push(`Раздел Луны ${d.id} ведёт на карточку ${d.card}, которой в Практике нет: поправь src/lib/assistant/destinations.js.`)
  }
  // То же для описаний разделов, которые Луна умеет открывать: модель видит их в системном промпте рядом с базой.
  for (const d of DESTINATIONS) {
    if (!d.about) continue
    const tabs = new Set(map.practice.filter((tab) => tab.cards.some((c) => cardOf(c.id)?.nav === d.nav)).map((tab) => tab.label))
    if (!tabs.size) continue
    for (const m of d.about.matchAll(/вкладк\S*\s+«([^»]+)»/gi)) {
      if (tabLabels.has(m[1]) && !tabs.has(m[1])) {
        gaps.push(`Раздел Луны ${d.id} пишет «вкладка «${m[1]}»», а карточка лежит во вкладке «${[...tabs].join('», «')}»: поправь about в src/lib/assistant/destinations.js.`)
      }
    }
  }
  for (const item of map.menu) {
    const rewardsOnly = item.key === 'tokens' || item.key === 'prizes'
    const kb = knowledgeText(undefined, { rewards: rewardsOnly })
    if (!kb.includes(item.label)) gaps.push(`Пункт меню «${item.label}» (${item.key}) не назван в базе знаний${rewardsOnly ? ' со включёнными наградами' : ''}: допиши его в ${KB}.`)
  }
  return gaps
}
