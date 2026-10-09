import { describe, expect, it } from 'vitest'
import {
  ATTRIBUTION_TTL_MS,
  captureAttribution,
  clearAttribution,
  landingAppPath,
  pickUtm,
  readAttribution,
  registrationFields,
  utmFields,
} from './attribution.js'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  }
}

describe('метки из адреса', () => {
  it('берутся только UTM, пустые выкидываются, длина режется', () => {
    const sp = new URLSearchParams(`?utm_source=%20instagram%20&utm_medium=&ref=x&utm_campaign=${'a'.repeat(300)}`)
    expect(pickUtm(sp)).toEqual({ utm_source: 'instagram', utm_campaign: 'a'.repeat(200) })
  })

  it('принимают и простой объект — тело запроса формы', () => {
    expect(pickUtm({ utm_term: 'english', junk: 1 })).toEqual({ utm_term: 'english' })
    expect(pickUtm(null)).toEqual({})
  })

  it('превращаются в поля запроса бэкенда', () => {
    expect(utmFields({ utm_source: 'google', utm_term: 'ielts' })).toEqual({ utmSource: 'google', utmTerm: 'ielts' })
  })
})

describe('ссылка с лендинга в приложение', () => {
  it('несёт from=landing и метки той рекламы, что привела на лендинг', () => {
    // Без этого зарегистрировавшийся по кнопке «Начать обучение» в amoCRM
    // неотличим от пришедшего прямо в приложение.
    const path = landingAppPath('/?screen=chat', { utm_source: 'instagram', utm_campaign: 'осень' })
    const sp = new URLSearchParams(path.split('?')[1])
    expect(path.startsWith('/?')).toBe(true)
    expect(sp.get('screen')).toBe('chat')
    expect(sp.get('from')).toBe('landing')
    expect(sp.get('utm_source')).toBe('instagram')
    expect(sp.get('utm_campaign')).toBe('осень')
  })

  it('не портит код перехода после заявки', () => {
    const path = landingAppPath('/?screen=reg-email&handoff=Ab-c_9', {})
    expect(new URLSearchParams(path.split('?')[1]).get('handoff')).toBe('Ab-c_9')
  })
})

describe('запоминание до регистрации', () => {
  it('пришёл с лендинга — запомнено и уходит в регистрацию', () => {
    const storage = memoryStorage()
    captureAttribution('?screen=chat&from=landing&utm_source=instagram', storage, 1000)
    expect(registrationFields(readAttribution(storage, 2000))).toEqual({ from: 'landing', utmSource: 'instagram' })
  })

  it('реклама прямо в приложение — метки без лендинга', () => {
    const storage = memoryStorage()
    captureAttribution('?utm_source=sms', storage, 1000)
    expect(registrationFields(readAttribution(storage, 2000))).toEqual({ utmSource: 'sms' })
  })

  it('заход без меток прошлую метку не стирает', () => {
    // Человек пришёл с лендинга, а регистрироваться вернулся по закладке.
    const storage = memoryStorage()
    captureAttribution('?from=landing', storage, 1000)
    expect(captureAttribution('?screen=chat', storage, 2000)).toBeNull()
    expect(readAttribution(storage, 3000)?.from).toBe('landing')
  })

  it('через 30 дней метка уже не засчитывается', () => {
    const storage = memoryStorage()
    captureAttribution('?from=landing', storage, 0)
    expect(readAttribution(storage, ATTRIBUTION_TTL_MS + 1)).toBeNull()
  })

  it('после регистрации стирается', () => {
    const storage = memoryStorage()
    captureAttribution('?from=landing', storage, 0)
    clearAttribution(storage)
    expect(registrationFields(readAttribution(storage, 1))).toEqual({})
  })

  it('сломанное или недоступное хранилище не ломает вход', () => {
    // Квоту localStorage съедает кэш каталогов; приватный режим бросает на доступе.
    const broken = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => { throw new Error('denied') },
    }
    expect(() => captureAttribution('?from=landing', broken)).not.toThrow()
    expect(readAttribution(broken)).toBeNull()
    expect(() => clearAttribution(broken)).not.toThrow()
    expect(readAttribution(null)).toBeNull()
    const garbage = memoryStorage()
    garbage.setItem('jts_attribution', '{не json')
    expect(readAttribution(garbage)).toBeNull()
  })
})
