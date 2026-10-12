// @vitest-environment jsdom
// На проде IELTS скрыт (lib/ieltsGate.js), но признак «аккаунт IELTS» бэкенд отдаёт и там: менеджер может поставить его
// в web-admin. Раньше гейт навешивали на отдельных потребителей (пропсы «Главной» и профиля), а эффекты App, сайдбар и
// «Словарь» читали признак как есть: ученик получал полуинтерфейс IELTS без раздела IELTS, а кнопка теста уровня
// возвращала его на «Главную» (App: ieltsAccount && test-intro → home). Гейт теперь в одном месте — в getIeltsMe.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./lib/session.js', () => ({ reportUnauthorized: vi.fn() }))
vi.mock('./lib/ieltsGate.js', () => ({ ieltsHidden: () => true }))

import { getIeltsMe, invalidateIeltsCache } from './api.js'

beforeEach(() => {
  invalidateIeltsCache()
  globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ieltsAccount: true, onboarded: true, access: true }) }))
})

describe('getIeltsMe при скрытом IELTS', () => {
  it('аккаунт IELTS читается как обычный — интерфейс General English целиком', async () => {
    const me = await getIeltsMe('t-prod')
    expect(me.ieltsAccount).toBe(false)
    expect(me.onboarded).toBe(false)
  })

  it('в бэкенд не ходит: раздела нет, спрашивать незачем', async () => {
    await getIeltsMe('t-prod')
    expect(fetch).not.toHaveBeenCalled()
  })
})
