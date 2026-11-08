import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { KNOWLEDGE } from './knowledge.js'
import { appScreens, buildSiteMap, coverage, diffSnapshots, knowledgeGaps, snapshotOf } from '../../../scripts/assistant-eval/siteMap.js'

// Автообновление базы знаний Луны (ТЗ v2.0, 9.2а): модель знает сайт только по статьям knowledge.js, поэтому новый
// экран или карточка Практики без статьи — это раздел, о котором Луна скажет «такого нет». Карта собирается из кода
// (scripts/assistant-eval/siteMap.js), а этот тест краснеет на каждой дыре с подсказкой, что дописать.

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
const map = buildSiteMap({ appSource: read('../../App.jsx'), i18nSource: read('../../i18n.jsx') })

describe('база знаний покрывает сайт ученика', () => {
  it('каждый экран, карточка Практики и пункт меню описаны, вкладки названы верно', () => {
    const gaps = knowledgeGaps(map)
    expect(gaps, `\n${gaps.join('\n')}\n`).toEqual([])
  })

  it('карта собрана из кода, а не пустая', () => {
    expect(map.screens).toContain('home')
    expect(map.screens).toContain('practice')
    expect(map.menu.map((i) => i.label)).toContain('Домашняя работа')
    expect(map.practice.map((t) => t.label)).toEqual(['Аудирование', 'Чтение', 'Письмо', 'Говорение', 'Грамматика'])
    expect(map.practice.find((t) => t.tab === 'speaking').cards.map((c) => c.title)).toContain('SpeakSpin: одна минута английского')
  })
})

describe('сторож ловит новое', () => {
  it('новый экран без статьи — красный тест с понятной подсказкой', () => {
    const gaps = knowledgeGaps({ ...map, screens: [...map.screens, 'marathons'] })
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toContain('Экран «marathons»')
    expect(gaps[0]).toContain('допиши статью в src/lib/assistant/knowledge.js')
  })

  it('новая карточка Практики без статьи', () => {
    const practice = map.practice.map((t) => (t.tab === 'reading' ? { ...t, cards: [...t.cards, { id: 'podcasts', title: 'Подкасты' }] } : t))
    const gaps = knowledgeGaps({ ...map, practice })
    expect(gaps.join('\n')).toContain('Карточка Практики «Подкасты» (podcasts, вкладка «Чтение») без статьи')
  })

  it('статья называет карточку не так, как её видит ученик', () => {
    const practice = map.practice.map((t) => ({ ...t, cards: t.cards.map((c) => (c.id === 'verbs' ? { ...c, title: 'Глаголы под бит' } : c)) }))
    expect(knowledgeGaps({ ...map, practice }).join('\n')).toContain('не называет карточку так, как её видит ученик: «Глаголы под бит»')
  })

  it('карточку перенесли в другую вкладку, а статья пишет старую', () => {
    const articles = KNOWLEDGE.map((a) => (a.id === 'verbs' ? { ...a, body: [...a.body, '- Карточка во вкладке «Говорение».'] } : a))
    expect(knowledgeGaps(map, articles).join('\n')).toContain('Статья verbs пишет «вкладка «Говорение»»')
  })

  it('экран убрали, а статья его всё ещё описывает', () => {
    const gaps = knowledgeGaps({ ...map, screens: map.screens.filter((s) => s !== 'speakspin') })
    expect(gaps.join('\n')).toContain('описывает экран «speakspin», которого в App.jsx больше нет')
  })

  it('пункт меню, которого нет в тексте базы', () => {
    const gaps = knowledgeGaps({ ...map, menu: [...map.menu, { key: 'marathons', label: 'Марафоны', screen: 'marathons' }] })
    expect(gaps.join('\n')).toContain('Пункт меню «Марафоны»')
  })

  it('шаблон «ielts-*» покрывает все экраны прохождения IELTS', () => {
    const cov = coverage(KNOWLEDGE, ['ielts-mock', 'ielts-new-run', 'home'])
    expect(cov.screens['ielts-new-run']).toContain('ielts')
    expect(cov.screens.home).toBeTruthy()
  })
})

describe('отчёт «новое / изменилось / удалено»', () => {
  it('сравнивает снимки по экранам, меню, вкладкам и статьям', () => {
    const before = snapshotOf(map)
    const after = snapshotOf({ ...map, screens: [...map.screens.filter((s) => s !== 'numbers'), 'marathons'] })
    const diff = diffSnapshots(before, after)
    expect(diff.added.join('\n')).toContain('экран «marathons» → нет статьи')
    expect(diff.removed.join('\n')).toContain('экран «numbers»')
    expect(diffSnapshots(before, before)).toEqual({ added: [], changed: [], removed: [] })
  })

  it('статья поменяла текст — это «изменилось»', () => {
    const articles = KNOWLEDGE.map((a) => (a.id === 'faq' ? { ...a, body: [...a.body, '- новое'] } : a))
    const diff = diffSnapshots(snapshotOf(map), snapshotOf(map, articles))
    expect(diff.changed.join('\n')).toContain('статья базы знаний «Частые вопросы → куда» (faq)')
  })

  it('экраны renderScreen читаются из текста App.jsx', () => {
    const src = "function renderScreen(view) {\n  switch (view) {\n    case 'home':\n      return 1\n    case 'a-b':\n    case 'c':\n      return 2\n  }\n}"
    expect(appScreens(src)).toEqual(['a-b', 'c', 'home'])
  })
})
