import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DESTINATIONS, destinationIdForScreen, destinationName, destinationOf, destinationsText, validAction } from './destinations.js'
import { EXPANDABLE, SKILL_KEYS } from '../../screens/practice/practiceTabs.js'
import { SCREEN_NAMES, buildContextBlock } from './prompt.js'
import { assistantAllowedOn } from './visibility.js'

const appSource = readFileSync(fileURLToPath(new URL('../../App.jsx', import.meta.url)), 'utf8')

describe('куда Луна умеет вести', () => {
  it('id уникальны и годятся в метку модели', () => {
    const ids = DESTINATIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/)
  })

  it('у каждого раздела имя на трёх языках', () => {
    for (const d of DESTINATIONS) {
      for (const lang of ['ru', 'kk', 'en']) expect(d.name[lang], `${d.id}.${lang}`).toBeTruthy()
    }
    expect(destinationName('practice-speaking', 'kk')).toBe('Тәжірибе → Айтылым')
    expect(destinationName('nope')).toBe('')
  })

  // Переход идёт через handleNav App — ключ, которого там нет, тихо не сделал
  // бы ничего, и Луна сказала бы «открываю» в пустоту.
  it('каждый ключ перехода знает handleNav в App', () => {
    for (const d of DESTINATIONS) {
      expect(appSource, `${d.id} → handleNav('${d.nav}')`).toContain(`key === '${d.nav}'`)
    }
  })

  it('цели Практики — существующие вкладки и разделы-списки', () => {
    for (const d of DESTINATIONS.filter((x) => x.nav === 'practice' && x.payload)) {
      if (d.payload.skill) expect(SKILL_KEYS).toContain(d.payload.skill)
      if (d.payload.filter) expect(EXPANDABLE.has(d.payload.filter), d.id).toBe(true)
    }
  })

  it('ни один раздел не ведёт туда, где помощника нет (тесты, экзамены, звонок)', () => {
    for (const d of DESTINATIONS) {
      expect(assistantAllowedOn(d.screen, { token: 'tok' }), d.screen).toBe(true)
    }
  })

  it('экраны раздела известны помощнику по имени', () => {
    for (const d of DESTINATIONS) {
      expect(SCREEN_NAMES[d.screen], d.screen).toBeTruthy()
    }
  })

  it('Cartoon World открывается напрямую', () => {
    expect(validAction('open', 'cartoons')).toEqual({ kind: 'open', target: 'cartoons', now: false })
    expect(destinationIdForScreen('cartoons')).toBe('cartoons')
  })

  it('действие проверяется по списку: тур — только где он есть', () => {
    expect(validAction('open', 'vocab')).toEqual({ kind: 'open', target: 'vocab', now: false })
    expect(validAction('tour', 'practice', true)).toEqual({ kind: 'tour', target: 'practice', now: true })
    expect(validAction('tour', 'reading')).toBeNull()
    expect(validAction('open', 'ielts')).toBeNull()
    expect(validAction('delete', 'vocab')).toBeNull()
    expect(destinationOf('__proto__')).toBeNull()
  })

  it('id раздела, где ученик сейчас, — модели в контекст, чтобы не сочиняла свой', () => {
    expect(destinationIdForScreen('practice')).toBe('practice')
    expect(destinationIdForScreen('kingdom')).toBe('learning')
    expect(destinationIdForScreen('tutor-dashboard')).toBe('tutor')
    expect(destinationIdForScreen('lesson-workspace')).toBeNull()
    const block = buildContextBlock({ user: { name: 'А' }, screen: { id: 'practice', text: 'x' }, lang: 'ru' })
    expect(block).toContain('Открытый раздел: Практика (id для метки: practice)')
  })

  // Разделы, чей материал заливают в админке (22.10.2026): без строки в таблице Луна говорила «такого нет».
  it('Just to Listen и Prepositions World открываются напрямую', () => {
    expect(validAction('open', 'listen')).toEqual({ kind: 'open', target: 'listen', now: false })
    expect(destinationIdForScreen('prepositions')).toBe('prepositions')
    expect(destinationsText()).toContain('- prepositions — Prepositions World (предлоги): курс английских предлогов')
  })

  it('«Грамматика · игры» открываются напрямую', () => {
    expect(validAction('open', 'grammar-games')).toEqual({ kind: 'open', target: 'grammar-games', now: false })
    expect(destinationIdForScreen('grammar-games')).toBe('grammar-games')
    expect(destinationsText()).toContain('- grammar-games — Грамматика · игры: 125 тем')
  })

  it('список для модели: id, имя и пометка тура', () => {
    const text = destinationsText()
    expect(text).toContain('- practice-speaking — Практика → Говорение: ')
    expect(text).toContain('- practice — Практика: все тренажёры, по вкладкам навыков (есть тур)')
    expect(text).not.toMatch(/reading — .*есть тур/)
  })
})
