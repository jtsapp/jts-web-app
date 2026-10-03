import { describe, it, expect } from 'vitest'
import { parseHosts, requestHost, routeLanding, appLink, sameHostUrl } from './hostRouting.js'

const hosts = parseHosts('﻿justtostudy-english.kz, WWW.justtostudy-english.kz ')
const APP = 'https://ai-tutor.justtostudy.kz'
const on = (host, pathname, search = '', extra = {}) =>
  routeLanding({ host, pathname, search, landingHosts: hosts, appUrl: APP, ...extra })

describe('parseHosts / requestHost', () => {
  it('список доменов из env: BOM, пробелы, регистр, порт', () => {
    expect([...parseHosts('﻿ a.kz ,B.kz:443,,')]).toEqual(['a.kz', 'b.kz'])
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
    for (const p of ['/_next/static/chunks/a.js', '/landing/img/dexter.webp', '/assets/dexter.png', '/fonts/x.woff2', '/favicon.ico'])
      expect(on('justtostudy-english.kz', p)).toEqual({ action: 'next' })
  })
  it('экраны приложения уводятся на домен приложения', () => {
    // Иначе вход сохранится в localStorage домена лендинга, и в приложении
    // ученик окажется разлогиненным.
    expect(on('justtostudy-english.kz', '/', '?screen=chat')).toEqual({ action: 'redirect', to: APP + '/?screen=chat' })
    expect(on('justtostudy-english.kz', '/trial/abc')).toEqual({ action: 'redirect', to: APP + '/trial/abc' })
    expect(on('justtostudy-english.kz', '/api/tts', '?t=1')).toEqual({ action: 'redirect', to: APP + '/api/tts?t=1' })
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
