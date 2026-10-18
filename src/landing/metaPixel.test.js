import { describe, it, expect, vi } from 'vitest'
import { DEFAULT_META_PIXEL_ID, metaPixelId, pixelBootstrap, pixelNoscriptSrc, trackLead } from './metaPixel.js'

describe('metaPixelId', () => {
  it('без настройки — пиксель сайта-платформы, не старый Tilda', () => {
    expect(metaPixelId(undefined)).toBe('1639157507717823')
    expect(DEFAULT_META_PIXEL_ID).not.toBe('5929087943811963')
  })
  it('переопределяется из окружения; BOM и пробелы срезаются', () => {
    expect(metaPixelId('\uFEFF 1234567890123 ')).toBe('1234567890123')
  })
  it('мусор в окружении в код страницы не попадает — берётся пиксель по умолчанию', () => {
    expect(metaPixelId("1');alert(1);('")).toBe(DEFAULT_META_PIXEL_ID)
    expect(metaPixelId('abc')).toBe(DEFAULT_META_PIXEL_ID)
    expect(metaPixelId('')).toBe(DEFAULT_META_PIXEL_ID)
  })
})

describe('код пикселя', () => {
  it('инициализирует нужный пиксель и шлёт PageView', () => {
    const code = pixelBootstrap('1639157507717823')
    expect(code).toContain("fbq('init','1639157507717823')")
    expect(code).toContain("fbq('track','PageView')")
    expect(code).toContain('connect.facebook.net/en_US/fbevents.js')
  })
  it('noscript-картинка с тем же пикселем', () => {
    expect(pixelNoscriptSrc('1639157507717823')).toBe('https://www.facebook.com/tr?id=1639157507717823&ev=PageView&noscript=1')
  })
})

describe('trackLead', () => {
  it('шлёт Lead с trial_form и eventID, возвращает этот eventID', () => {
    const fbq = vi.fn()
    const id = trackLead({ fbq, crypto: { randomUUID: () => 'uuid-1' } })
    expect(id).toBe('uuid-1')
    expect(fbq).toHaveBeenCalledTimes(1)
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', { content_name: 'trial_form' }, { eventID: 'uuid-1' })
  })
  it('без пикселя на странице ничего не делает', () => {
    expect(trackLead({})).toBeNull()
    expect(trackLead(null)).toBeNull()
  })
  it('сбой пикселя заявку не ломает', () => {
    const fbq = vi.fn(() => { throw new Error('blocked') })
    expect(trackLead({ fbq })).toBeNull()
  })
})
