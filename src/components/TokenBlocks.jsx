'use client'

import Image from 'next/image'
import { useI18n } from '../i18n.jsx'
import { coinLegend, nextPrizeOf, useStudentTokens } from '../practice/practiceTokens.js'
import './tokenBlocks.css'

const number = (value) => new Intl.NumberFormat().format(Number(value) || 0)

const TARIFF_NAMES = { gen: 'General', prem: 'Premium', grp: 'Group', ielts: 'IELTS', sat: 'SAT', kids: 'Kids' }

function shortDate(value, lang) {
  const parsed = new Date(`${String(value || '').slice(0, 10)}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return String(value || '')
  return new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed)
}

/** Плашка пилота токенов (ТЗ, раздел 10): токены идут как обычно, штраф только показывается. */
export function TokenPilotBar({ pilot }) {
  const { t, lang } = useI18n()
  if (!pilot?.active) return null
  return (
    <div className="tb-pilot" role="note" data-testid="token-pilot">
      <b>{t('home.tokens.pilot.title', { from: shortDate(pilot.from, lang), to: shortDate(pilot.to, lang) })}</b>
      <span>{t('home.tokens.pilot.text')}</span>
    </div>
  )
}

/** Легенда монет периода: серебряная, фиолетовая, золотая и максимум. */
export function CoinLegend({ period }) {
  const { t } = useI18n()
  if (!period) return null
  return (
    <div className="tb-legend" data-testid="coin-legend">
      {coinLegend(period).map((tier) => (
        <span key={tier.key} className={`tb-legend__item tb-legend__item--${tier.key}`}>
          <i />{t(`rewards.legend.${tier.key}`)} — {number(tier.from)}–{number(tier.to)}
        </span>
      ))}
      <span className="tb-legend__max">{t('rewards.legend.max', { n: number(period.max) })}</span>
    </div>
  )
}

/**
 * Блок токенов на главной ученика (макет кабинета студента): сколько токенов и до какого приза осталось, пилот,
 * предупреждение «Заходите каждый день» и три карточки — за урок, за практику, Feedback.
 */
export default function TokenBlocks({ token, onNav }) {
  const { t } = useI18n()
  const data = useStudentTokens(token)
  const period = data?.period
  if (!period) return null

  const balance = Number(period.balance) || 0
  const prizes = Array.isArray(data.prizes) ? data.prizes : []
  const next = nextPrizeOf(prizes, balance)
  const opened = prizes.filter((prize) => Number(prize.costTokens) <= balance).length
  const idle = Number(period.idlePoints) || 0
  const lessons = data.lessonPoints || {}
  const cap = Number(data.dailyCap) || 0
  const myTariff = TARIFF_NAMES[data.myTariff] ? data.myTariff : 'gen'
  const myPoints = Number.isFinite(Number(data.myLessonPoints)) ? Number(data.myLessonPoints) : Number(lessons[myTariff]) || 0
  const fill = next ? Math.min(100, Math.round((balance / Number(next.costTokens)) * 100)) : 100

  return (
    <section className="tb" data-testid="home-token-blocks">
      <div className="tb-hero">
        <Image src="/assets/world/coin.png" width={72} height={72} alt="" />
        <div className="tb-hero__text">
          <h2>{t('home.tokens.balance', { n: number(balance), period: period.label || t('rewards.period.current') })}</h2>
          <p>{next ? t('home.tokens.toPrize', { name: next.name, n: number(next.costTokens - balance) }) : t('home.tokens.allOpen')}</p>
          {next && <div className="tb-bar"><i style={{ width: `${fill}%` }} /></div>}
        </div>
        <button type="button" className="tb-hero__btn" onClick={() => onNav?.('prizes')}>
          {t('home.tokens.prizes', { got: opened, total: prizes.length })}
        </button>
      </div>

      <TokenPilotBar pilot={data.pilot} />

      {idle > 0 && (
        <div className="tb-idle" role="note" data-testid="home-idle-warning">
          <div>
            <b>{t('home.tokens.idle.title')}</b>
            <span>{t('home.tokens.idle.text', { n: number(idle) })}</span>
          </div>
          <button type="button" onClick={() => onNav?.('practice')}>{t('home.tokens.idle.cta')}</button>
        </div>
      )}

      <div className="tb-cards">
        <article className="tb-card">
          <h3>{t('home.tokens.lesson.title')}</h3>
          <strong>+{number(myPoints)}</strong>
          <small>{t('home.tokens.lesson.hint', { tariff: TARIFF_NAMES[myTariff], prem: number(lessons.prem) })}</small>
        </article>
        <article className="tb-card">
          <h3>{t('home.tokens.practice.title')}</h3>
          <strong>+{t('home.tokens.practice.range')}</strong>
          <small>
            {cap > 0 ? t('home.tokens.practice.hint', { cap: number(cap) }) : ''}
            <button type="button" className="tb-link" onClick={() => onNav?.('practice')}>{t('home.tokens.practice.link')}</button>
          </small>
        </article>
        <article className="tb-card">
          <h3>{t('home.tokens.feedback.title')}</h3>
          <small>{t('home.tokens.feedback.text')}</small>
          <button type="button" className="tb-btn" onClick={() => onNav?.('feedback')}>{t('home.tokens.feedback.cta')}</button>
        </article>
      </div>
    </section>
  )
}

/** «Все начисления за практику»: где, за что, сколько токенов; последней строкой — урок с преподавателем. */
export function PracticeTokenTable({ data }) {
  const { t } = useI18n()
  const rules = Array.isArray(data?.practiceRules) ? data.practiceRules : []
  if (!rules.length) return null
  const lessons = data.lessonPoints || {}
  return (
    <section className="tb-table" data-testid="practice-token-table">
      <h3>{t('practice.tokens.table')}</h3>
      <table>
        <thead>
          <tr><th>{t('practice.tokens.where')}</th><th>{t('practice.tokens.what')}</th><th>{t('practice.tokens.amount')}</th></tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={`${rule.section}|${rule.name}`}>
              <td>{rule.section}</td><td>{rule.name}</td><td>+{number(rule.points)}</td>
            </tr>
          ))}
          <tr>
            <td>{t('practice.tokens.lessons')}</td><td>{t('practice.tokens.lessonRow')}</td>
            <td>+{number(lessons.gen)} / +{number(lessons.prem)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/** Подпись под заголовком «Практики»: монеты рядом с разделами и пределы. */
export function PracticeTokenSub({ data }) {
  const { t } = useI18n()
  if (!Array.isArray(data?.practiceRules) || !data.practiceRules.length) return null
  const cap = Number(data.dailyCap) || 0
  return <p className="tb-sub">{cap > 0 ? t('practice.tokens.sub', { cap: number(cap) }) : t('practice.tokens.subNoCap')}</p>
}
