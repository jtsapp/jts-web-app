import { test, expect } from '@playwright/test'
import {
  LANG_NAME,
  resolveLangName,
  buildTipPrompt,
} from '../src/lib/shadowing/tipPrompt.js'

const score = {
  accuracy: 82,
  fluency: 75,
  prosody: 60,
  overall: 72,
  words: [
    { word: 'honour', error: 'None', accuracy: 55 },
    { word: 'opportunity', error: 'Mispronunciation', accuracy: 40 },
    { word: 'the', error: 'None', accuracy: 95 },
  ],
}

test.describe('shadowing tipPrompt — язык совета', () => {
  test('коды языка совпадают с i18n (ru/en/kk)', () => {
    expect(Object.keys(LANG_NAME).sort()).toEqual(['en', 'kk', 'ru'])
  })

  test('неизвестный/пустой код → русский (как дефолт i18n)', () => {
    expect(resolveLangName('kz')).toBe('Russian') // i18n использует kk, не kz
    expect(resolveLangName('fr')).toBe('Russian')
    expect(resolveLangName(undefined)).toBe('Russian')
    expect(resolveLangName('')).toBe('Russian')
  })

  // Регрессия: раньше язык задавался одной слабой фразой и haiku «сползал» в
  // английский. Теперь язык вывода задан жёстко и продублирован в user-сообщении.
  for (const [lang, name] of [
    ['ru', 'Russian'],
    ['en', 'English'],
    ['kk', 'Kazakh'],
  ]) {
    test(`lang=${lang}: язык задан жёстко и продублирован`, () => {
      const { systemPrompt, userMessage } = buildTipPrompt(score, 'Honour the opportunity', lang)
      // Жёсткая установка в system: «ENTIRE tip in <Language>».
      expect(systemPrompt).toContain(`Write the ENTIRE tip in ${name}`)
      // Явно разрешено оставлять по-английски только отрабатываемые слова.
      expect(systemPrompt).toContain('only the specific English words being practiced may appear in English')
      // Дубль в user-сообщении.
      expect(userMessage).toContain(`Answer in ${name}.`)
    })
  }

  test('в промпт попадают слабые/ошибочные слова (accuracy<70 или error)', () => {
    const { userMessage } = buildTipPrompt(score, 'ref', 'ru')
    expect(userMessage).toContain('honour') // accuracy 55 < 70
    expect(userMessage).toContain('opportunity') // ошибка
    expect(userMessage).not.toContain('the,') // корректное слово не тянем
  })

  test('нет слабых слов → "none"', () => {
    const clean = { ...score, words: [{ word: 'ok', error: 'None', accuracy: 99 }] }
    const { userMessage } = buildTipPrompt(clean, 'ref', 'ru')
    expect(userMessage).toContain('Weak or incorrect words: none.')
  })
})
