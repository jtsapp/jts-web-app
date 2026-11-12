import { describe, it, expect } from 'vitest'
import { parseHosts, requestHost, routeLanding, appLink, sameHostUrl, checkoutOrigin, shortLinkSlug } from './hostRouting.js'

const hosts = parseHosts('\uFEFFjusttostudy-english.kz, WWW.justtostudy-english.kz ')
const APP = 'https://ai-tutor.justtostudy.kz'
const on = (host, pathname, search = '', extra = {}) =>
  routeLanding({ host, pathname, search, landingHosts: hosts, appUrl: APP, ...extra })

describe('parseHosts / requestHost', () => {
  it('список доменов из env: BOM, пробелы, регистр, порт', () => {
    expect([...parseHosts('\uFEFF a.kz ,B.kz:443,,')]).toEqual(['a.kz', 'b.kz'])
    expect(parseHosts('').size).toBe(0)
    expect(parseHosts(undefined).size).toBe(0)
  })
  it('хост запроса: сначала X-Forwarded-Host от nginx, порт отрезан', () => {
    const h = new Map([['host', '127.0.0.1:3000'], ['x-forwarded-host', 'JustToStudy-English.kz, proxy.local']])
    expect(requestHost(h)).toBe('justtostudy-english.kz')
    expect(requestHost(new Map([['host', 'localhost:3410']]))).toBe('localhost')
  })
})

describe('домен лендинга', () => {
  it('корень показывает лендинг, язык в адресе сохраняется', () => {
    expect(on('justtostudy-english.kz', '/')).toEqual({ action: 'rewrite', to: '/landing' })
    expect(on('www.justtostudy-english.kz', '/', '?lang=kz')).toEqual({ action: 'rewrite', to: '/landing?lang=kz' })
  })
  it('/landing на своём домене — на корень, адрес у страницы один', () => {
    expect(on('justtostudy-english.kz', '/landing', '?lang=kz')).toEqual({ action: 'redirect', to: '/?lang=kz' })
  })
  it('картинки, шрифты и бандл отдаются как есть', () => {
    for (const p of ['/_next/static/chunks/a.js', '/landing/img/dexter.webp', '/assets/dexter.png', '/legal/2026-10-29/offer-ru.pdf', '/fonts/x.woff2', '/favicon.ico', '/api/landing/lead', '/info/tariffs'])
      expect(on('justtostudy-english.kz', p)).toEqual({ action: 'next' })
  })
  it('экраны приложения уводятся на домен приложения', () => {
    // Иначе вход сохранится в localStorage домена лендинга, и в приложении
    // ученик окажется разлогиненным.
    expect(on('justtostudy-english.kz', '/', '?screen=chat')).toEqual({ action: 'redirect', to: APP + '/?screen=chat' })
    expect(on('justtostudy-english.kz', '/trial/abc')).toEqual({ action: 'redirect', to: APP + '/trial/abc' })
  })
  // Оплата картой — на домене лендинга (анкета Freedom Pay, оферта, политика):
  // витрина, её вход и роуты приложения отвечают здесь.
  it('витрина тарифов и минут, API — на домене лендинга', () => {
    expect(on('justtostudy-english.kz', '/', '?screen=pricing&offer=ind-60-12')).toEqual({ action: 'next' })
    expect(on('justtostudy-english.kz', '/', '?screen=minutes')).toEqual({ action: 'next' })
    expect(on('justtostudy-english.kz', '/api/tts', '?t=1')).toEqual({ action: 'next' })
    expect(on('justtostudy-english.kz', '/api/profile')).toEqual({ action: 'next' })
  })
  it('куда уводить оплату', () => {
    expect(checkoutOrigin({ onLandingHost: false, landingHosts: hosts })).toBe('https://justtostudy-english.kz')
    expect(checkoutOrigin({ onLandingHost: true, landingHosts: hosts })).toBeNull()
    expect(checkoutOrigin({ onLandingHost: false, landingHosts: parseHosts('') })).toBeNull()
  })
  it('короткая ссылка /имя — в роут ссылок, метки адреса с собой', () => {
    expect(on('justtostudy-english.kz', '/Dana')).toEqual({ action: 'rewrite', to: '/api/landing/go/dana' })
    expect(on('justtostudy-english.kz', '/dana_01/', '?fbclid=1')).toEqual({ action: 'rewrite', to: '/api/landing/go/dana_01?fbclid=1' })
    // И без адреса приложения: ссылка живёт на лендинге.
    expect(on('justtostudy-english.kz', '/dana', '', { appUrl: '' })).toEqual({ action: 'rewrite', to: '/api/landing/go/dana' })
  })
  it('адреса самого сайта и вложенные пути — не короткие ссылки', () => {
    expect(on('justtostudy-english.kz', '/trial')).toEqual({ action: 'redirect', to: APP + '/trial' })
    expect(on('justtostudy-english.kz', '/info')).toEqual({ action: 'redirect', to: APP + '/info' })
    for (const p of ['/', '/a', '/dana/x', '/дана', '/-dana', '/' + 'a'.repeat(41), '/favicon.ico', '/report'])
      expect(shortLinkSlug(p)).toBeNull()
  })
  it('на домене приложения /имя — не короткая ссылка', () => {
    expect(on('ai-tutor.justtostudy.kz', '/dana')).toEqual({ action: 'next' })
  })
  it('без адреса приложения — не уводим в никуда', () => {
    expect(on('justtostudy-english.kz', '/trial/abc', '', { appUrl: '' })).toEqual({ action: 'next' })
  })
})

describe('остальные домены', () => {
  it('/landing спрятан: страница живёт только на своём домене', () => {
    expect(on('ai-tutor.justtostudy.kz', '/landing')).toEqual({ action: 'notFound' })
    expect(on('ai-tutor.justtostudy.kz', '/landing', '?lang=kz')).toEqual({ action: 'notFound' })
  })
  it('приложение не трогаем', () => {
    expect(on('ai-tutor.justtostudy.kz', '/')).toEqual({ action: 'next' })
    expect(on('ai-tutor.justtostudy.kz', '/', '?screen=chat')).toEqual({ action: 'next' })
    expect(on('ai-tutor.justtostudy.kz', '/landing/img/dexter.webp')).toEqual({ action: 'next' })
  })
  it('локальная разработка и превью-стенд видят /landing', () => {
    expect(on('localhost', '/landing')).toEqual({ action: 'next' })
    expect(on('127.0.0.1', '/landing')).toEqual({ action: 'next' })
    expect(on('dev-tutor.justtostudy.kz', '/landing', '', { preview: true })).toEqual({ action: 'next' })
  })
  it('домены не заданы — лендинг нигде, кроме локалки', () => {
    const none = (host, p) => routeLanding({ host, pathname: p, search: '', landingHosts: parseHosts(''), appUrl: APP })
    expect(none('justtostudy-english.kz', '/')).toEqual({ action: 'next' })
    expect(none('ai-tutor.justtostudy.kz', '/landing')).toEqual({ action: 'notFound' })
  })
})

describe('sameHostUrl', () => {
  it('адрес из заголовков nginx, а не из адреса апстрима', () => {
    const h = new Map([['host', '127.0.0.1:3000'], ['x-forwarded-host', 'justtostudy-english.kz'], ['x-forwarded-proto', 'https']])
    expect(sameHostUrl(h, '/?lang=kz')).toBe('https://justtostudy-english.kz/?lang=kz')
    expect(sameHostUrl(new Map([['host', 'justtostudy-english.kz']]), '/')).toBe('https://justtostudy-english.kz/')
  })
})

describe('appLink', () => {
  it('на домене лендинга кнопки ведут в приложение абсолютной ссылкой', () => {
    expect(appLink('/?screen=chat', { onLandingHost: true, appUrl: APP })).toBe(APP + '/?screen=chat')
    expect(appLink('/?screen=chat', { onLandingHost: false, appUrl: APP })).toBe('/?screen=chat')
    expect(appLink('/?screen=chat', { onLandingHost: true, appUrl: '' })).toBe('/?screen=chat')
  })
})
