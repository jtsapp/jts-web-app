// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// На сайте английский и казахский приезжают чанком. Весь остальной vitest получает их сразу (langTables.eager.js), поэтому
// сама задержка проверяется здесь: загрузчик подменён обещанием, которое тест отпускает сам.
const pending = {}
vi.mock('./i18n/langTables.js', () => ({
  EAGER_LANGS: {},
  loadLangTable: vi.fn((lang) => new Promise((resolve) => {
    pending[lang] = resolve
  })),
}))

const TABLE = { kk: { 'common.back': 'Артқа' }, en: { 'common.back': 'Back' } }

async function open(saved) {
  vi.resetModules()
  localStorage.clear()
  if (saved) localStorage.setItem('lang', saved)
  const { I18nProvider, useI18n } = await import('./i18n.jsx')
  let api
  function Probe() {
    api = useI18n()
    return <p>{api.t('common.back')}|{api.lang}|{api.langReady ? 'готов' : 'ждёт'}</p>
  }
  render(<I18nProvider><Probe /></I18nProvider>)
  return () => api
}

describe('словарь выбранного языка едет чанком', () => {
  beforeEach(() => {
    for (const k of Object.keys(pending)) delete pending[k]
  })

  it('русский готов сразу и ничего не качает', async () => {
    await open(null)
    expect(screen.getByText('Назад|ru|готов')).toBeTruthy()
    expect(pending).toEqual({})
  })

  // App держит спиннер по langReady, поэтому кабинет русским не мигает.
  it('казахский: пока чанк в пути, откат на русский и признак «ждёт»', async () => {
    await open('kk')
    expect(screen.getByText('Назад|kk|ждёт')).toBeTruthy()
    await act(async () => pending.kk(TABLE.kk))
    expect(screen.getByText('Артқа|kk|готов')).toBeTruthy()
  })

  // Без этого сбой сети оставил бы ученика перед вечным спиннером.
  it('чанк не приехал: остаётся русский, экран не ждёт', async () => {
    await open('kk')
    await act(async () => pending.kk(null))
    expect(screen.getByText('Назад|kk|готов')).toBeTruthy()
  })

  it('смена языка: экран переключается, когда словарь приехал, а не остаётся на это время русским', async () => {
    const api = await open(null)
    act(() => api().setLang('en'))
    expect(screen.getByText('Назад|ru|готов')).toBeTruthy()
    expect(localStorage.getItem('lang')).toBe('en')
    await act(async () => pending.en(TABLE.en))
    expect(screen.getByText('Back|en|готов')).toBeTruthy()
  })

  it('побеждает последний выбранный язык, даже если его словарь приехал первым', async () => {
    const api = await open(null)
    act(() => api().setLang('en'))
    act(() => api().setLang('kk'))
    await act(async () => pending.kk(TABLE.kk))
    await act(async () => pending.en(TABLE.en))
    expect(screen.getByText('Артқа|kk|готов')).toBeTruthy()
  })

  it('незнакомый язык в хранилище не ждёт чанка', async () => {
    await open('de')
    expect(screen.getByText('Назад|ru|готов')).toBeTruthy()
  })
})
