import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { SAT_SYNC_DICT } from './i18nSync.js'

// Ключи из кода синхронизации SAT, которых нет ни в общем словаре, ни в i18nSync.js — строка на экране показала бы
// голый ключ. Общий словарь читаем текстом (i18n.jsx — JSX), ключи ru-блока.
function dictKeys() {
  const src = fs.readFileSync(path.join(__dirname, '../i18n.jsx'), 'utf8')
  const ru = src.slice(0, src.indexOf('\n  en: {'))
  const have = new Set([...ru.matchAll(/^\s+['"]([^'"]+)['"]:/gm)].map((m) => m[1]))
  for (const k of Object.keys(SAT_SYNC_DICT.ru)) have.add(k)
  return have
}

const FILES = [
  'sat/weekly/WeeklyCard.jsx', 'screens/SatWeeklyPage.jsx', 'sat/dashboard/DashboardStats.jsx',
  'sat/study/PracticeSummary.jsx', 'sat/study/LogErrorDialog.jsx', 'sat/tabs/ErrorsTab.jsx', 'sat/tabs/MocksTab.jsx',
  'sat/mock/ScoresPanel.jsx', 'screens/SatPapersPage.jsx', 'sat/vocab/Flashcards.jsx',
  'components/ExamDemoBanner.jsx', 'sat/mock/MockResult.jsx', 'screens/SatStudyPage.jsx', 'screens/SatPage.jsx',
]

describe('строки синхронизации SAT', () => {
  it('ru, en и kk содержат одни и те же ключи, без пустых значений', () => {
    const ru = Object.keys(SAT_SYNC_DICT.ru).sort()
    expect(Object.keys(SAT_SYNC_DICT.en).sort()).toEqual(ru)
    expect(Object.keys(SAT_SYNC_DICT.kk).sort()).toEqual(ru)
    for (const l of ['ru', 'en', 'kk']) for (const k of ru) expect(String(SAT_SYNC_DICT[l][k]).trim(), `${l}:${k}`).not.toBe('')
  })

  it('подстановки {n} одинаковы во всех языках', () => {
    const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
    for (const k of Object.keys(SAT_SYNC_DICT.ru)) {
      expect(vars(SAT_SYNC_DICT.en[k]), k).toBe(vars(SAT_SYNC_DICT.ru[k]))
      expect(vars(SAT_SYNC_DICT.kk[k]), k).toBe(vars(SAT_SYNC_DICT.ru[k]))
    }
  })

  it('каждый литеральный ключ t(...) новых экранов есть в словаре', () => {
    const have = dictKeys()
    const missing = []
    for (const f of FILES) {
      const s = fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
      for (const m of s.matchAll(/['`]((?:sat|exam)\.[a-zA-Z0-9_.]+)['`]/g)) {
        if (!have.has(m[1]) && ![...have].some((k) => k.startsWith(`${m[1]}.`))) missing.push(`${f}: ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })
})
