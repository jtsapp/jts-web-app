import { describe, it, expect } from 'vitest'
import { validateLead, createRateLimiter, sendLeadToCrm, maskPhone } from './leadServer.js'
import { sealHandoff, openHandoff, handoffSecret, HANDOFF_TTL_MS } from './handoff.js'

describe('validateLead', () => {
  it('имя, номер целиком, цель и язык', () => {
    expect(validateLead({ name: ' Алия ', phone: '+7 (747) 163-41-18', goal: 'IELTS', lang: 'kz' })).toEqual({
      ok: true, lead: { name: 'Алия', digits: '7471634118', goal: 'IELTS', lang: 'kz', utm: {} },
    })
  })
  it('UTM-метки чистятся, а не проверяются: кривая метка не повод терять заявку', () => {
    const { lead } = validateLead({
      name: 'Алия', phone: '7471634118', utm: { utm_source: ' instagram ', utm_medium: '', evil: 'x' },
    })
    expect(lead.utm).toEqual({ utm_source: 'instagram' })
    expect(validateLead({ name: 'Алия', phone: '7471634118', utm: 'мусор' }).lead.utm).toEqual({})
  })
  it('без имени или с неполным номером — отказ с причиной', () => {
    expect(validateLead({ name: '', phone: '7471634118' })).toEqual({ ok: false, error: 'name' })
    expect(validateLead({ name: 'А'.repeat(101), phone: '7471634118' })).toEqual({ ok: false, error: 'name' })
    expect(validateLead({ name: 'Алия', phone: '+7 (747) 163' })).toEqual({ ok: false, error: 'phone' })
    expect(validateLead(null)).toEqual({ ok: false, error: 'name' })
  })
  it('незнакомый язык — русский, длинная цель обрезается', () => {
    const { lead } = validateLead({ name: 'А', phone: '7471634118', lang: 'en', goal: 'x'.repeat(100) })
    expect(lead.lang).toBe('ru')
    expect(lead.goal).toHaveLength(64)
  })
})

describe('createRateLimiter', () => {
  it('пять заявок с адреса за окно, шестая — нет, после окна снова можно', () => {
    const allow = createRateLimiter({ max: 5, windowMs: 1000 })
    for (let i = 0; i < 5; i++) expect(allow('1.2.3.4', i)).toBe(true)
    expect(allow('1.2.3.4', 10)).toBe(false)
    expect(allow('5.6.7.8', 10)).toBe(true)
    expect(allow('1.2.3.4', 1001)).toBe(true)
  })
})

describe('sendLeadToCrm', () => {
  const lead = { name: 'Алия', digits: '7471634118', goal: 'IELTS', lang: 'kz' }

  it('ключ в заголовке, номер в формате бэкенда', async () => {
    const calls = []
    const fetchImpl = async (url, init) => { calls.push([url, init]); return { ok: true, status: 204 } }
    expect(await sendLeadToCrm(lead, { backendUrl: 'https://api', key: 'k', fetchImpl })).toEqual({ sent: true })
    expect(calls[0][0]).toBe('https://api/landing/leads')
    expect(calls[0][1].headers['X-Landing-Key']).toBe('k')
    expect(JSON.parse(calls[0][1].body)).toEqual({ name: 'Алия', phone: '77471634118', goal: 'IELTS', lang: 'kz' })
  })
  it('метки рекламы уходят полями, которые ждёт бэкенд (LandingLeadRequest.utm*)', async () => {
    const calls = []
    const fetchImpl = async (url, init) => { calls.push([url, init]); return { ok: true, status: 204 } }
    await sendLeadToCrm({ ...lead, utm: { utm_source: 'instagram', utm_campaign: 'autumn' } },
      { backendUrl: 'https://api', key: 'k', fetchImpl })
    expect(JSON.parse(calls[0][1].body)).toMatchObject({ utmSource: 'instagram', utmCampaign: 'autumn' })
  })
  it('без ключа не ходит вовсе', async () => {
    const fetchImpl = async () => { throw new Error('не должен звать') }
    expect(await sendLeadToCrm(lead, { backendUrl: 'https://api', key: '', fetchImpl })).toEqual({ sent: false, reason: 'no_key' })
  })
  it('ошибка бэкенда и сети не бросает — форма своё дело сделала', async () => {
    expect(await sendLeadToCrm(lead, { backendUrl: 'x', key: 'k', fetchImpl: async () => ({ ok: false, status: 404 }) }))
      .toEqual({ sent: false, reason: 'status_404' })
    expect(await sendLeadToCrm(lead, { backendUrl: 'x', key: 'k', fetchImpl: async () => { throw new TypeError('fetch failed') } }))
      .toEqual({ sent: false, reason: 'network' })
  })
  it('в логах номер без середины', () => {
    expect(maskPhone('7471634118')).toBe('747•••••18')
  })
})

describe('код передачи в регистрацию', () => {
  const lead = { name: 'Алия', digits: '7471634118', lang: 'kz' }

  it('запечатанное открывается тем же секретом', () => {
    const t = sealHandoff(lead, 's3cret', 1000)
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(t).not.toContain('7471634118')
    expect(openHandoff(t, 's3cret', 2000)).toEqual({ name: 'Алия', digits: '7471634118', lang: 'kz' })
  })
  it('чужой секрет, порча и просрочка — null', () => {
    const t = sealHandoff(lead, 's3cret', 1000)
    expect(openHandoff(t, 'other', 2000)).toBeNull()
    expect(openHandoff(t.slice(0, -2) + (t.endsWith('A') ? 'BB' : 'AA'), 's3cret', 2000)).toBeNull()
    expect(openHandoff(t, 's3cret', 1000 + HANDOFF_TTL_MS + 1)).toBeNull()
    expect(openHandoff('мусор', 's3cret')).toBeNull()
    expect(openHandoff(null, 's3cret')).toBeNull()
  })
  it('без секрета код не выпускается', () => {
    expect(sealHandoff(lead, '')).toBeNull()
  })
  it('секрет: свой, иначе INTERNAL_API_KEY', () => {
    expect(handoffSecret({ LANDING_HANDOFF_SECRET: ' a ', INTERNAL_API_KEY: 'b' })).toBe('a')
    expect(handoffSecret({ INTERNAL_API_KEY: 'b' })).toBe('b')
    expect(handoffSecret({})).toBe('')
  })
})
